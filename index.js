const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const paypal = require('paypal-rest-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// PayPal Configuration
paypal.configure({
    mode: 'sandbox', // 'sandbox' or 'live'
    client_id: 'AaZd6ssjvmHgWG_0BA5vp66iF5zjZI5KDqLnAq_DG6mGl9Ny7wPzgYoLzhBPQFhwfJS8cqHYwPDNdkCR',
    client_secret: 'EA3dM_ZPK0R9AAqug98lttDZaNWYudJKeZtcY4N75JTGtZbLIsGBoAE8JG8MBrugSDhG8dqww5XqESYY',
});

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const DATA_FILE = path.join(__dirname, 'streamData.json');

// Load existing stream data from the JSON file
let streamData = { videoPath: null, streamKeys: [] };
if (fs.existsSync(DATA_FILE)) {
  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  streamData = JSON.parse(rawData);
}

// Resume streams on server startup
if (streamData.videoPath && streamData.streamKeys.length > 0) {
  console.log('Resuming previous streams...');
  streamData.streamKeys.forEach(streamKey => {
    startStream(streamData.videoPath, streamKey);
  });
}

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Database Setup
const dbPath = path.join(__dirname, 'db');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath);
const db = new sqlite3.Database(path.join(dbPath, 'live_stream.db'), (err) => {
    if (err) console.error('Failed to connect to the database:', err.message);
    else console.log('Connected to the SQLite database.');
});

// Create Users Table
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        plan TEXT,
        expiration_date TEXT
    )
`);

// Serve the main page (HTML with animations)
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Go Live - Streaming Service</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f20544;
            color: white;
          }

          .header {
            text-align: center;
            padding: 40px 20px;
          }

          .header h1 {
            font-size: 3rem;
            margin: 0;
          }

          .header p {
            font-size: 1.2rem;
            margin-top: 10px;
            line-height: 1.5;
          }

          .buttons-container {
            margin-top: 20px;
          }

          .button {
            display: inline-block;
            margin: 10px;
            padding: 15px 30px;
            font-size: 1rem;
            color: #f20544;
            background-color: white;
            border: none;
            border-radius: 30px;
            text-decoration: none;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.3s, background-color 0.3s;
          }

          .button:hover {
            background-color: #ffe6eb;
            transform: scale(1.1);
          }

          .main-content {
            text-align: center;
            padding: 20px;
          }

          .image-container img {
            max-width: 100%;
            height: auto;
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0);
          }

          .steps-section {
            margin-top: 40px;
            text-align: center;
          }

          .steps-section h2 {
            font-size: 2rem;
            margin-bottom: 20px;
          }

          .steps-container {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 40px;
            flex-wrap: wrap;
          }

          .step {
            text-align: center;
            max-width: 200px;
          }

          .step img {
            width: 80px;
            height: 80px;
            margin-bottom: 10px;
          }

          .step p {
            font-size: 1rem;
            font-weight: bold;
          }

          footer {
            text-align: center;
            padding: 20px;
            background-color: #e8043b;
            color: white;
            font-size: 0.8rem;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Go Live</h1>
          <p>
            Stream your Pre-Recorded videos 24x7 & get more Suggested<br />
            and Browse feature video views.<br />
            Unlock the new technique of growing subscribers & earn 13x more.
          </p>
          <div class="buttons-container">
            <button class="button" onclick="location.href='/register'">Register</button>
            <button class="button" onclick="location.href='/login'">Login</button>
          </div>
        </div>

        <div class="main-content">
          <div class="image-container">
            <!-- Add your image link here -->
            <img src="https://cdn.discordapp.com/attachments/1326441737387769926/1333804839540490381/illustration-011.png?ex=679a3a0e&is=6798e88e&hm=654980f7520749a7df7ecaae9fb1e6c20bf65a29a0a9d4447e65b98d8f8be8c0&" alt="Streaming Flow" />
          </div>
        </div>

        <div class="steps-section">
          <h2>How It Works</h2>
          <div class="steps-container">
            <div class="step">
              <img src="https://cdn.discordapp.com/attachments/1326441737387769926/1333803826779525130/Edit_Account.png?ex=679a391d&is=6798e79d&hm=2dcd72ec1d8e80b2c7c23a6514b3770a2fc2d373c6b66a1817c91c65aee849fd&" alt="Create Account" />
              <p>Create Account & Choose Your Plan</p>
            </div>
            <div class="step">
              <img src="https://cdn.discordapp.com/attachments/1326441737387769926/1333803827043897396/Upload_to_Cloud.png?ex=679a391d&is=6798e79d&hm=545167cb2305b2d997f4fab76bc76edce63f734488045d6c5152cd56ca101274&" alt="Upload Videos" />
              <p>Upload Your Pre-Recorded Videos</p>
            </div>
            <div class="step">
              <img src="https://cdn.discordapp.com/attachments/1326441737387769926/1333803827383767082/Key.png?ex=679a391d&is=6798e79d&hm=11a55b15809774ccd45d8cbce2e98458a6971dfb8f4c880053b660497c576695&" alt="Stream Key" />
              <p>Set Your Live Stream Key</p>
            </div>
            <div class="step">
              <img src="https://cdn.discordapp.com/attachments/1326441737387769926/1333803827589025863/Natural_User_Interface_2.png?ex=679a391d&is=6798e79d&hm=b79aa9a1a59611b3886336f51013379ccba32b5e0d5048d5b107c2e5573323ff&" alt="Start Streaming" />
              <p>Just Click & Start Streaming</p>
            </div>
          </div>
        </div>

        <footer>
          <p>&copy; 24/7 Live Streaming Service</p>
        </footer>
      </body>
    </html>
  `);
});



// Route to serve registration page
app.get('/register', (req, res) => {
    res.send(`
    <html>
        <head>
            <title>Register</title>
            <style>
                body {
                    font-family: 'Poppins', sans-serif;
                    background-color: #f20544;
                    color: white;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    height: 100vh;
                    overflow: hidden;
                }

                .container {
                    padding: 40px;
                    max-width: 500px;
                    background-color: white;
                    color: #f20544;
                    border-radius: 15px;
                    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    animation: fadeIn 1.2s ease-in-out;
                    margin: auto;
                    position: relative;
                    z-index: 1;
                }

                h1 {
                    font-size: 2.5rem;
                    margin-bottom: 20px;
                    color: #f20544;
                }

                p {
                    font-size: 1.1rem;
                    margin-bottom: 20px;
                    color: #555;
                }

                form input, form button {
                    width: 100%;
                    padding: 12px 20px;
                    margin: 10px 0;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    font-size: 1em;
                    transition: all 0.3s ease;
                }

                form input:focus, form button:focus {
                    border-color: #f20544;
                    box-shadow: 0 0 12px rgba(242, 5, 68, 0.5);
                    outline: none;
                }

                form button {
                    background-color: #f20544;
                    color: white;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                }

                form button:hover {
                    background-color: #e8043b;
                }

                footer {
                    text-align: center;
                    padding: 10px 0;
                    background-color: rgba(0, 0, 0, 0.7);
                    color: white;
                    position: absolute;
                    bottom: 0;
                    width: 100%;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Register</h1>
                <p>Create your account to get started</p>
                <form action="/register" method="post">
                    <input type="email" name="email" placeholder="Email" required />
                    <input type="password" name="password" placeholder="Password" required />

                    <!-- Plan Buttons -->
                    <button type="submit" name="plan" value="1week">1 Week - $299</button>
                    <button type="submit" name="plan" value="2week">2 Weeks - $499</button>
                    <button type="submit" name="plan" value="3week">3 Weeks - $749</button>
                    <button type="submit" name="plan" value="1month">1 Month - $1099</button>
                    <button type="submit" name="plan" value="2month">2 Months - $1999</button>
                </form>
            </div>
            <footer>
                <p>&copy; 2025 24/7 Live Streaming Service</p>
            </footer>
        </body>
    </html>
    `);
});



app.post('/register', (req, res) => {
    const { email, password, plan } = req.body;

    const planDetails = {
        '1week': { price: 299, duration: 7 },
        '2week': { price: 499, duration: 14 },
        '3week': { price: 749, duration: 21 },
        '1month': { price: 1099, duration: 30 },
        '2month': { price: 1999, duration: 60 },
    };

    const selectedPlan = planDetails[plan];
    if (!selectedPlan) return res.status(400).send('Invalid plan selected.');

    const createPaymentJson = {
        intent: 'sale',
        payer: { payment_method: 'paypal' },
        redirect_urls: {
            return_url: `https://219bb0a9-9966-4eb3-a920-145e82dcf434-00-zc5nvixfdo7u.sisko.replit.dev:8080/success?email=${email}&password=${password}&plan=${plan}`,
            cancel_url: `http://localhost:${PORT}/cancel`,
        },
        transactions: [{
            amount: { currency: 'USD', total: selectedPlan.price.toString() },
            description: `Payment for ${plan}`,
        }],
    };

    paypal.payment.create(createPaymentJson, (error, payment) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Error creating PayPal payment.');
        }

        const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
        res.redirect(approvalUrl);
    });
});



app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Go Live - Streaming Service</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f20544;
            color: white;
            text-align: center;
          }

          .container {
            padding: 40px 20px;
            margin: 20px auto;
            max-width: 600px;
            background-color: white;
            color: #f20544;
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          h1 {
            font-size: 2.5rem;
            margin: 0;
          }

          p {
            font-size: 1.2rem;
            margin-top: 10px;
            line-height: 1.5;
          }

          .button {
            display: inline-block;
            margin-top: 10px;
            padding: 5px 10px;
            font-size: 1rem;
            color: white;
            background-color: #f20544;
            border: none;
            border-radius: 30px;
            text-decoration: none;
            font-weight: bold;
            cursor: pointer;
          }

          .button:hover {
            background-color: #e8043b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Payment Canceled</h1>
          <p>We're sorry, but your payment was canceled.</p>
          <p>Please <a href="/register" class="button">Try Again</a> or <a href="/login" class="button">Login</a> if you have an account.</p>
        </div>
        <footer>
          <p>&copy; 24/7 Live Streaming Service</p>
        </footer>
      </body>
    </html>
  `);
});




// Handle PayPal success
app.get('/success', (req, res) => {
    const { paymentId, PayerID, email, password, plan } = req.query;

    const executePaymentJson = { payer_id: PayerID };

    paypal.payment.execute(paymentId, executePaymentJson, (error) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Error executing PayPal payment.');
        }

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + {
            '1week': 7, '2week': 14, '3week': 21, '1month': 30, '2month': 60,
        }[plan]);

        db.run(
            `INSERT INTO users (email, password, plan, expiration_date) VALUES (?, ?, ?, ?)`,
            [email, password, plan, expirationDate.toISOString()],
            (err) => {
                if (err) return res.status(500).send('Error registering user.');
                res.send('Registration and payment successful. You can now log in.');
            }
        );
    });
});


const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    // User is authenticated, proceed to the next handler
    return next();
  } else {
    // User is not authenticated, redirect to login
    res.redirect('/login');
  }
};



// Handle Login
app.get('/login', (req, res) => {
    res.send(`
    <html>
        <head>
            <title>Login</title>
            <style>
                body {
                    font-family: 'Poppins', sans-serif;
                    background-color: #f20544;
                    color: white;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    height: 100vh;
                    overflow: hidden;
                }

                .container {
                    padding: 40px;
                    max-width: 500px;
                    background-color: white;
                    color: #f20544;
                    border-radius: 15px;
                    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    animation: fadeIn 1.2s ease-in-out;
                    margin: auto;
                    position: relative;
                    z-index: 1;
                }

                h1 {
                    font-size: 2.5rem;
                    margin-bottom: 20px;
                    color: #f20544;
                }

                p {
                    font-size: 1.1rem;
                    margin-bottom: 20px;
                    color: #555;
                }

                form input {
                    width: 100%;
                    padding: 12px 20px;
                    margin: 10px 0;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    font-size: 1em;
                    transition: all 0.3s ease;
                }

                form input:focus {
                    border-color: #f20544;
                    box-shadow: 0 0 12px rgba(242, 5, 68, 0.5);
                    outline: none;
                }

                form button {
                    background-color: #f20544;
                    color: white;
                    padding: 12px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 1em;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                }

                form button:hover {
                    background-color: #e8043b;
                }

                footer {
                    text-align: center;
                    padding: 10px 0;
                    background-color: rgba(0, 0, 0, 0.7);
                    color: white;
                    position: absolute;
                    bottom: 0;
                    width: 100%;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Login</h1>
                <p>Enter your credentials to access your account</p>
                <form action="/login" method="post">
                    <input type="email" name="email" placeholder="Email" required />
                    <input type="password" name="password" placeholder="Password" required />
                    <button type="submit">Login</button>
                </form>
            </div>
            <footer>
                <p>&copy; 2025 24/7 Live Streaming Service</p>
            </footer>
        </body>
    </html>
    `);
});


// Function to start a stream
function startStream(filePath, streamKey) {
    const ffmpegCommand = `ffmpeg -re -stream_loop -1 -i ${filePath} -vcodec libx264 -preset veryfast -crf 25 -c:a aac -b:a 128k -ar 44100 -maxrate 1000k -bufsize 2000k -g 60 -r 15 -s 640x360 -f flv "rtmp://a.rtmp.youtube.com/live2/${streamKey}"`;
    const ffmpegProcess = spawn('bash', ['-c', ffmpegCommand]);

    ffmpegProcess.stdout.on('data', (data) => console.log(`FFmpeg stdout: ${data}`));
    ffmpegProcess.stderr.on('data', (data) => console.error(`FFmpeg stderr: ${data}`));
    ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg exited with code ${code}`);
        if (code !== 0) {
            console.log('Stream disconnected. Reconnecting...');
            startStream(filePath, streamKey);
        }
    });
}

// Route to handle stream start
app.get('/stream', (req, res) => {
  const videoUploaded = streamData.videoPath
    ? `<div class="message">Video uploaded successfully. Stream Key(s): ${streamData.streamKeys.join(', ')}</div>`
    : '';

  res.send(`
    <html>
      <head>
        <title>Upload Video</title>
        <style>
          body {
            font-family: 'Poppins', sans-serif;
            background-color: #f20544;
            color: white;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100vh;
            overflow: hidden;
          }

          .upload-container {
            padding: 40px;
            max-width: 500px;
            background-color: white;
            color: #f20544;
            border-radius: 15px;
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
            text-align: center;
            animation: fadeIn 1.2s ease-in-out;
            margin: auto;
            position: relative;
            z-index: 1;
          }

          h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            color: #f20544;
          }

          form input {
            width: 100%;
            padding: 12px 20px;
            margin: 10px 0;
            border: 1px solid #ccc;
            border-radius: 8px;
            font-size: 1em;
            transition: all 0.3s ease;
          }

          form input:focus {
            border-color: #f20544;
            box-shadow: 0 0 12px rgba(242, 5, 68, 0.5);
            outline: none;
          }

          form button {
            background-color: #f20544;
            color: white;
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-size: 1em;
            cursor: pointer;
            transition: background-color 0.3s ease;
          }

          form button:hover {
            background-color: #e8043b;
          }

          .message {
            margin-top: 20px;
            padding: 10px;
            background: #e6ffe6;
            color: #2b8a2b;
            border: 1px solid #b2e7b2;
            border-radius: 8px;
            font-size: 0.9em;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        </style>
      </head>
      <body>
        <div class="upload-container">
          <h1>Upload Video for Streaming</h1>
          <form action="/upload" method="post" enctype="multipart/form-data">
            <input type="file" name="video" required placeholder="Choose a video" />
            <input type="text" name="streamKeys" required placeholder="Enter Stream Keys (comma-separated)" />
            <button type="submit">Start Stream</button>
          </form>
          ${videoUploaded}
        </div>
      </body>
    </html>
  `);
});



app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, user) => {
        if (err) return res.status(500).send('Database error.');

        if (!user) {
            return res.status(401).send(`
                <html>
                    <head>
                        <title>Login</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background: linear-gradient(135deg, #4facfe, #00f2fe);
                                height: 100vh;
                                margin: 0;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                            }

                            .login-container {
                                background: white;
                                padding: 40px;
                                border-radius: 15px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                                animation: fadeIn 1.2s ease-in-out;
                                text-align: center;
                            }

                            h1 {
                                color: #4facfe;
                                font-size: 2em;
                                margin-bottom: 20px;
                            }

                            form input {
                                width: 100%;
                                padding: 12px 20px;
                                margin: 10px 0;
                                border: 1px solid #ccc;
                                border-radius: 8px;
                                font-size: 1em;
                                transition: all 0.3s ease;
                            }

                            form input:focus {
                                border-color: #4facfe;
                                box-shadow: 0 0 8px rgba(79, 172, 254, 0.5);
                                outline: none;
                            }

                            form button {
                                background: #4facfe;
                                color: white;
                                padding: 12px 20px;
                                border: none;
                                border-radius: 8px;
                                font-size: 1em;
                                cursor: pointer;
                                transition: background 0.3s ease;
                            }

                            form button:hover {
                                background: #3583e8;
                            }

                            .error-message {
                                color: red;
                                margin-bottom: 10px;
                            }

                            @keyframes fadeIn {
                                from {
                                    opacity: 0;
                                    transform: translateY(-20px);
                                }
                                to {
                                    opacity: 1;
                                    transform: translateY(0);
                                }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="login-container">
                            <h1>Login</h1>
                            <div class="error-message">Invalid credentials. Please try again.</div>
                            <form action="/login" method="post">
                                <input type="email" name="email" placeholder="Email" required />
                                <input type="password" name="password" placeholder="Password" required />
                                <button type="submit">Login</button>
                                <p>Don't have an account? <a href="/register">Register</a></p>
                            </form>
                        </div>
                    </body>
                </html>
            `);
        }

        const now = new Date();
        if (new Date(user.expiration_date) < now) {
            return res.status(403).send('Plan expired. Please renew.');
        }

        req.session.user = { id: user.id, email: user.email };
        res.redirect('/stream');
    });
});




app.post('/upload', upload.single('video'), (req, res) => {
  const filePath = path.join(__dirname, req.file.path);
  const streamKeysInput = req.body.streamKeys;

  if (!streamKeysInput) {
    return res.status(400).send('Stream keys are required.');
  }

  // Save the stream data
  streamData = {
    videoPath: filePath,
    streamKeys: streamKeysInput.split(',').map(key => key.trim())
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(streamData));

  // Start the streams
  streamData.streamKeys.forEach(streamKey => startStream(filePath, streamKey));

  res.send('Streams started successfully!');
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
