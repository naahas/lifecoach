// ========= APPLICATION VUE.JS =========
const app = new Vue({
    el: '#app',
    data: {
        connected: false,
        currentSection: 'home',
        videoInterval: null,
        currentVideoIndex: 0,

         bookingModal: {
            show: false,
            currentStep: 1,
            loading: false,
            success: false,
            data: {
                // Step 1: Objectif
                objective: '',
                objectiveDetails: '',
                
                // Step 2: Profil
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                age: null,
                gender: '',
                height: null,
                weight: null,
                fitnessLevel: 'beginner',
                healthIssues: '',
                
                // Step 3 & 4: Date & Heure
                selectedDate: '',
                selectedTime: '',
                location: 'home',
                address: '',
                
                // Step 5: Confirmation
                termsAccepted: false
            }
        },
        
        // Calendar data
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        
        // Available time slots
        morningSlots: ['07:00', '08:30', '10:00', '11:30'],
        afternoonSlots: ['14:00', '15:30', '17:00'],
        eveningSlots: ['18:30', '20:00'],
        
        // Booked slots (exemple - à récupérer depuis le serveur)
        bookedSlots: {}
    },

    computed: {
        currentMonthYear() {
            const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
            return `${months[this.currentMonth]} ${this.currentYear}`;
        },
        
        calendarDays() {
            const days = [];
            const firstDay = new Date(this.currentYear, this.currentMonth, 1);
            const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
            const startDate = new Date(firstDay);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Ajuster pour commencer le lundi
            const firstDayOfWeek = firstDay.getDay() || 7;
            startDate.setDate(startDate.getDate() - firstDayOfWeek + 1);
            
            // Générer 42 jours (6 semaines)
            for (let i = 0; i < 42; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);
                
                days.push({
                    date: currentDate.toISOString().split('T')[0],
                    number: currentDate.getDate(),
                    otherMonth: currentDate.getMonth() !== this.currentMonth,
                    isPast: currentDate < today,
                    available: currentDate >= today && currentDate.getDay() !== 0 // Pas dimanche
                });
            }
            
            return days;
        },
        
        formatSelectedDate() {
            if (!this.bookingModal.data.selectedDate) return '';
            const date = new Date(this.bookingModal.data.selectedDate + 'T00:00:00');
            const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            return date.toLocaleDateString('fr-FR', options);
        },
        
        canProceed() {
            const step = this.bookingModal.currentStep;
            const data = this.bookingModal.data;
            
            switch(step) {
                case 1:
                    return data.objective !== '';
                case 2:
                    return data.firstName && data.lastName && data.email && data.phone && data.age;
                case 3:
                    return data.selectedDate !== '';
                case 4:
                    return data.selectedTime !== '' && (data.location !== 'home' || data.address);
                case 5:
                    return data.termsAccepted;
                default:
                    return true;
            }
        },
        
        getObjectiveLabel() {
            const objectives = {
                'weight-loss': 'Perte de poids',
                'muscle-gain': 'Prise de muscle',
                'fitness': 'Remise en forme',
                'performance': 'Performance sportive'
            };
            return objectives[this.bookingModal.data.objective] || '';
        },
        
        getLocationLabel() {
            const locations = {
                'home': 'À domicile',
                'outdoor': 'En extérieur',
                'gym': 'En salle'
            };
            return locations[this.bookingModal.data.location] || '';
        }
    },
    
    mounted() {
        // Attendre que le DOM soit prêt
        this.$nextTick(() => {
            this.initVideoCarousel();
            this.initScrollAnimations();
            this.initNavigation();
        });

        this.$nextTick(() => {
            // Gérer tous les liens vers #booking
            document.querySelectorAll('a[href="#booking"]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openBookingModal();
                });
            });
        });
        
        // Socket.IO connection
        const socket = io();
        
        socket.on('connect', () => {
            this.connected = true;
            console.log('Connected to server');
        });

        socket.on('disconnect', () => {
            this.connected = false;
            console.log('Disconnected from server');
        });
    },

    methods: {

        refreshMe() {
            location.reload();
        },

        openBookingModal() {
            this.bookingModal.show = true;
            this.bookingModal.currentStep = 1;
            document.body.style.overflow = 'hidden';
        },
        
        closeBookingModal() {
            this.bookingModal.show = false;
            document.body.style.overflow = '';
            // Reset form after animation
            setTimeout(() => {
                this.resetBookingForm();
            }, 500);
        },
        
        closeSuccessModal() {
            this.bookingModal.success = false;
            this.closeBookingModal();
        },
        
        resetBookingForm() {
            this.bookingModal.currentStep = 1;
            this.bookingModal.data = {
                objective: '',
                objectiveDetails: '',
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                age: null,
                gender: '',
                height: null,
                weight: null,
                fitnessLevel: 'beginner',
                healthIssues: '',
                selectedDate: '',
                selectedTime: '',
                location: 'home',
                address: '',
                termsAccepted: false
            };
        },
        
        // Step navigation
        nextStep() {
            if (this.canProceed && this.bookingModal.currentStep < 5) {
                this.bookingModal.currentStep++;
            }
        },
        
        previousStep() {
            if (this.bookingModal.currentStep > 1) {
                this.bookingModal.currentStep--;
            }
        },
        
        // Step 1: Objective selection
        selectObjective(objective) {
            this.bookingModal.data.objective = objective;
        },
        
        // Step 3: Calendar navigation
        previousMonth() {
            if (this.currentMonth === 0) {
                this.currentMonth = 11;
                this.currentYear--;
            } else {
                this.currentMonth--;
            }
        },
        
        nextMonth() {
            if (this.currentMonth === 11) {
                this.currentMonth = 0;
                this.currentYear++;
            } else {
                this.currentMonth++;
            }
        },
        
        selectDate(day) {
            if (day.available && !day.isPast) {
                this.bookingModal.data.selectedDate = day.date;
                // Charger les créneaux disponibles pour cette date
                this.loadAvailableSlots(day.date);
            }
        },
        
        // Step 4: Time selection
        selectTime(time) {
            if (this.isSlotAvailable(time)) {
                this.bookingModal.data.selectedTime = time;
            }
        },
        
        isSlotAvailable(time) {
            const date = this.bookingModal.data.selectedDate;
            if (!this.bookedSlots[date]) return true;
            return !this.bookedSlots[date].includes(time);
        },
        
        loadAvailableSlots(date) {
            // Ici, faire un appel Socket.IO pour récupérer les créneaux réservés
            const socket = io();
            socket.emit('getBookedSlots', { date }, (response) => {
                if (response.success) {
                    this.$set(this.bookedSlots, date, response.bookedSlots);
                }
            });
        },
        
        // Step 5: Submit booking
        async submitBooking() {
            if (!this.bookingModal.data.termsAccepted) return;
            
            this.bookingModal.loading = true;
            
            try {
                const response = await fetch('/api/booking', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.bookingModal.data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.bookingModal.loading = false;
                    this.bookingModal.success = true;
                    
                    // Fermer après 5 secondes
                    setTimeout(() => {
                        this.closeSuccessModal();
                    }, 5000);
                } else {
                    throw new Error(result.message || 'Erreur lors de la réservation');
                }
            } catch (error) {
                console.error('Erreur:', error);
                this.bookingModal.loading = false;
                alert('Une erreur est survenue. Veuillez réessayer.');
            }
        },

        initVideoCarousel() {
            const videos = document.querySelectorAll('.hero-video');
            const dots = document.querySelectorAll('.video-dot');
            
            if (!videos.length) return;
            
            let currentVideo = 0;
            let timeoutId = null;

            // Configuration des segments vidéo (en secondes)
            const videoConfig = [
                { start: 0, duration: 3 },   
                { start: 0, duration: 3 },    
                { start: 0, duration: 3 }    
            ];

            // Précharger les vidéos
            videos.forEach((video) => {
                video.load();
                video.muted = true;
            });

            // Function to switch video
            const switchVideo = (index) => {
                if (timeoutId) clearTimeout(timeoutId);
                
                // Masquer toutes les vidéos et dots
                videos.forEach(v => v.classList.remove('active'));
                dots.forEach(d => d.classList.remove('active'));
                
                // Afficher la vidéo sélectionnée
                videos[index].classList.add('active');
                dots[index].classList.add('active');
                
                // Jouer la vidéo
                videos[index].currentTime = videoConfig[index].start;
                videos[index].play().catch(e => console.log("Autoplay bloqué"));
                
                // Arrêter après la durée configurée et passer à la suivante
                timeoutId = setTimeout(() => {
                    videos[index].pause();
                    currentVideo = (currentVideo + 1) % videos.length;
                    switchVideo(currentVideo);
                }, videoConfig[index].duration * 1000);
            };

            // Démarrer après un petit délai
            setTimeout(() => {
                switchVideo(0);
            }, 100);

            // Manual switch on dot click
            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    currentVideo = index;
                    switchVideo(currentVideo);
                });
            });
        },

        initScrollAnimations() {
            // Scroll reveal animation
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                    }
                });
            }, observerOptions);

            document.querySelectorAll('.scroll-reveal').forEach(el => {
                observer.observe(el);
            });
        },

        initNavigation() {
            // Smooth scrolling
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(anchor.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });



            // Navbar scroll effect
            window.addEventListener('scroll', () => {
                const navbar = document.getElementById('navbar');
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });

            // Mobile menu toggle
            const menuToggle = document.getElementById('menuToggle');
            const navLinks = document.getElementById('navLinks');

            if (menuToggle && navLinks) {
                menuToggle.addEventListener('click', () => {
                    navLinks.classList.toggle('active');
                    menuToggle.innerHTML = navLinks.classList.contains('active') 
                        ? '<i class="fas fa-times"></i>' 
                        : '<i class="fas fa-bars"></i>';
                });

                // Close mobile menu on link click
                document.querySelectorAll('.nav-links a').forEach(link => {
                    link.addEventListener('click', () => {
                        navLinks.classList.remove('active');
                        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
                    });
                });
            }

            // Marquer la section active dans la navbar
const updateActiveSection = () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a:not(.cta-button)');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
};

window.addEventListener('scroll', updateActiveSection);
updateActiveSection(); // Appel initial
        }

        
    },
    
    beforeDestroy() {
        if (this.videoInterval) {
            clearInterval(this.videoInterval);
        }
    }
});