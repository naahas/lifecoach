const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { Resend } = require('resend');


require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);


// Main constants
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type']
    }
});

// Session middleware
const tmin = 60000;
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 30 * tmin,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
});

// Middlewares
app.use(cors());
app.use(express.static('src/html'));
app.use(express.static('src/style'));
app.use(express.static('src/script'));
app.use(express.static('src/img'));
app.use(sessionMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
io.engine.use(sessionMiddleware);


const bookings = new Map();

// Routes
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/src/html/index.html');
});

// API Route pour créer une réservation
// API Route pour créer une réservation - VERSION CORRIGÉE
app.post('/api/booking', async (req, res) => {
    try {
        const bookingData = req.body;
        
        // Générer un ID unique pour la réservation
        const bookingId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        // Sauvegarder la réservation
        const booking = {
            id: bookingId,
            ...bookingData,
            createdAt: new Date().toISOString(),
            status: 'confirmed'
        };
        
        bookings.set(bookingId, booking);
        
        // Préparer les données pour l'email
        const objectiveLabels = {
            'weight-loss': 'Perte de poids',
            'muscle-gain': 'Prise de muscle',
            'fitness': 'Remise en forme',
            'performance': 'Performance sportive'
        };
        
        const locationLabels = {
            'home': 'À domicile',
            'outdoor': 'En extérieur',
            'gym': 'En salle'
        };
        
        const fitnessLevelLabels = {
            'beginner': 'Débutant',
            'intermediate': 'Intermédiaire',
            'advanced': 'Avancé'
        };
        
        // Formater la date
        const bookingDate = new Date(bookingData.selectedDate + 'T00:00:00');
        const formattedDate = bookingDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        // Envoyer l'email de confirmation au client
        const clientEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ff6b35, #ff8c42); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .section { margin-bottom: 25px; padding: 15px; background: white; border-radius: 8px; }
                .section h3 { color: #ff6b35; margin-top: 0; }
                .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .info-row:last-child { border-bottom: none; }
                .label { font-weight: bold; color: #666; }
                .value { color: #333; }
                .button { display: inline-block; background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin-top: 20px; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                .warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 5px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Réservation Confirmée ! 🎯</h1>
                    <p style="margin: 0; font-size: 18px;">Life Coach: Training Hard</p>
                </div>
                
                <div class="content">
                    <p>Bonjour <strong>${bookingData.firstName}</strong>,</p>
                    
                    <p>Ta séance de coaching sportif est confirmée ! Je suis impatient de t'accompagner dans ta transformation.</p>
                    
                    <div class="section">
                        <h3>📅 Détails de ta séance</h3>
                        <div class="info-row">
                            <span class="label">Date :</span>
                            <span class="value">${formattedDate}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Heure :</span>
                            <span class="value">${bookingData.selectedTime}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Durée :</span>
                            <span class="value">1h20</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Lieu :</span>
                            <span class="value">${locationLabels[bookingData.location]}</span>
                        </div>
                        ${bookingData.address ? `
                        <div class="info-row">
                            <span class="label">Adresse :</span>
                            <span class="value">${bookingData.address}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="section">
                        <h3>🎯 Ton objectif</h3>
                        <p><strong>${objectiveLabels[bookingData.objective]}</strong></p>
                        ${bookingData.objectiveDetails ? `<p>${bookingData.objectiveDetails}</p>` : ''}
                        <p>Niveau actuel : <strong>${fitnessLevelLabels[bookingData.fitnessLevel]}</strong></p>
                    </div>
                    
                    <div class="section">
                        <h3>💰 Tarif</h3>
                        <p style="font-size: 24px; color: #ff6b35; margin: 10px 0;"><strong>60€</strong></p>
                        <p>Paiement sur place (espèces ou virement)</p>
                    </div>
                    
                    <div class="section">
                        <h3>📱 Contact</h3>
                        <p>WhatsApp : <a href="https://wa.me/33769941881">+33 7 69 94 18 81</a></p>
                        <p>Si tu as des questions ou si tu dois modifier ton rendez-vous, n'hésite pas à me contacter.</p>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Politique d'annulation :</strong> Merci de prévenir au moins 24h à l'avance en cas d'empêchement.
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="font-size: 18px; color: #ff6b35;">À très bientôt pour ta séance ! 💪</p>
                        <p><strong>Jos - Life Coach</strong></p>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Life Coach: Training Hard - Coaching Sportif Premium</p>
                    <p>Île-de-France | 7j/7</p>
                </div>
            </div>
        </body>
        </html>
        `;

        // EMAIL POUR LE COACH - CETTE PARTIE MANQUAIT !
        const coachEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
                .info-section { margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; }
                .info-row { padding: 8px 0; border-bottom: 1px solid #ddd; }
                .info-row:last-child { border-bottom: none; }
                .label { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🆕 Nouvelle Réservation</h2>
                </div>
                <div class="content">
                    <div class="info-section">
                        <h3>👤 Client</h3>
                        <div class="info-row">
                            <span class="label">Nom :</span> ${bookingData.firstName} ${bookingData.lastName}
                        </div>
                        <div class="info-row">
                            <span class="label">Email :</span> ${bookingData.email}
                        </div>
                        <div class="info-row">
                            <span class="label">Téléphone :</span> ${bookingData.phone}
                        </div>
                        <div class="info-row">
                            <span class="label">Âge :</span> ${bookingData.age} ans
                        </div>
                        ${bookingData.gender ? `
                        <div class="info-row">
                            <span class="label">Sexe :</span> ${bookingData.gender === 'male' ? 'Homme' : bookingData.gender === 'female' ? 'Femme' : 'Autre'}
                        </div>
                        ` : ''}
                        ${bookingData.height ? `
                        <div class="info-row">
                            <span class="label">Taille :</span> ${bookingData.height} cm
                        </div>
                        ` : ''}
                        ${bookingData.weight ? `
                        <div class="info-row">
                            <span class="label">Poids :</span> ${bookingData.weight} kg
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="info-section">
                        <h3>📅 Séance</h3>
                        <div class="info-row">
                            <span class="label">Date :</span> ${formattedDate}
                        </div>
                        <div class="info-row">
                            <span class="label">Heure :</span> ${bookingData.selectedTime}
                        </div>
                        <div class="info-row">
                            <span class="label">Lieu :</span> ${locationLabels[bookingData.location]}
                        </div>
                        ${bookingData.address ? `
                        <div class="info-row">
                            <span class="label">Adresse :</span> ${bookingData.address}
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="info-section">
                        <h3>🎯 Objectif et Niveau</h3>
                        <div class="info-row">
                            <span class="label">Objectif :</span> ${objectiveLabels[bookingData.objective]}
                        </div>
                        ${bookingData.objectiveDetails ? `
                        <div class="info-row">
                            <span class="label">Détails :</span> ${bookingData.objectiveDetails}
                        </div>
                        ` : ''}
                        <div class="info-row">
                            <span class="label">Niveau :</span> ${fitnessLevelLabels[bookingData.fitnessLevel]}
                        </div>
                        ${bookingData.healthIssues ? `
                        <div class="info-row">
                            <span class="label">Santé/Blessures :</span> ${bookingData.healthIssues}
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="info-section" style="background: #fff3cd; border: 1px solid #ffc107;">
                        <p style="margin: 0;"><strong>ID Réservation :</strong> ${bookingId}</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
        
        // Envoyer l'email au client
        await resend.emails.send({
            from: 'Life Coach <onboarding@resend.dev>', // Utilisez onboarding@resend.dev pour les tests
            to: bookingData.email,
            subject: `Confirmation de ta séance - ${formattedDate} à ${bookingData.selectedTime}`,
            html: clientEmailHtml
        });
        
        // Envoyer l'email au coach
        await resend.emails.send({
            from: 'Life Coach <onboarding@resend.dev>', // Utilisez onboarding@resend.dev pour les tests
            to: 'votre-email@gmail.com', // Remplacez par votre email
            subject: `Nouvelle réservation - ${bookingData.firstName} ${bookingData.lastName} - ${formattedDate}`,
            html: coachEmailHtml
        });
        
        // Envoyer la réponse de succès
        res.json({
            success: true,
            message: 'Réservation confirmée avec succès',
            bookingId: bookingId
        });
        
    } catch (error) {
        console.error('Erreur lors de la réservation:', error);
        res.status(500).json({
            success: false,
            message: 'Une erreur est survenue lors de la réservation'
        });
    }
});

// API Route pour récupérer les créneaux réservés
app.get('/api/booked-slots/:date', (req, res) => {
    const { date } = req.params;
    const bookedSlots = [];
    
    // Parcourir toutes les réservations pour cette date
    for (const booking of bookings.values()) {
        if (booking.selectedDate === date && booking.status === 'confirmed') {
            bookedSlots.push(booking.selectedTime);
        }
    }
    
    res.json({
        success: true,
        bookedSlots: bookedSlots
    });
});



// Socket.IO
io.on('connection', (socket) => {
    console.log("Connexion acceptée:", socket.id);

    // Déconnexion
    socket.on('disconnect', () => {
        console.log("Déconnexion:", socket.id);
        
      
    });
});














































// Démarrage du serveur
const PORT = process.env.PORT || 7000;
server.listen(PORT, function(err) {
    if (err) throw err;
    console.log("-------------------");
    console.log("Server on port", PORT);
    console.log("-------------------");
});