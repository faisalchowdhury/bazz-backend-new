export const template = `
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${process.env.AppName}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Arial', sans-serif;
        background-color: #f8f9fa; /* Light gray background */
        color: #333;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        line-height: 1.6;
      }

      /* Navbar Styles */
      nav {
        width: 100%;
        background-color: #ffffff; /* White background */
        padding: 15px 0;
        text-align: center;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Subtle shadow */
      }

      nav a {
        color: #333;
        font-size: 1rem;
        text-decoration: none;
        margin: 0 20px;
        padding: 10px;
        text-transform: uppercase;
        font-weight: 600;
        transition: color 0.3s ease;
      }

      nav a:hover {
        color: #ff6f61; /* Vibrant accent color */
      }

      /* Hero Section */
      .hero {
        width: 100%;
        background-color: #ffffff; /* White background */
        color: #333;
        padding: 150px 20px 150px 20px;
        text-align: center;
  
      }

      .hero h1 {
        font-size: 3rem;
        margin-bottom: 15px;
        color: #333;
      }

      .hero h2 {
        font-size: 1.5rem;
        margin-bottom: 20px;
        font-weight: 300;
        color: #666;
      }

      .hero .cta-button {
        background-color: #ff6f61; /* Vibrant accent color */
        color: #ffffff; /* White text */
        padding: 12px 30px;
        font-size: 1rem;
        border: none;
        border-radius: 25px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        font-weight: 600;
        text-transform: uppercase;
      }

      .hero .cta-button:hover {
        background-color: #ff4a3d; /* Darker shade on hover */
      }

      /* Features Section */
      .features {
        width: 80%;
        max-width: 1000px;
        padding: 50px 20px;
        text-align: center;
        background-color: #ffffff;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        margin-top: -40px;
        z-index: 10;
      }

      .features h3 {
        font-size: 2.5rem;
        margin-bottom: 20px;
        color: #333;
      }

      .features p {
        font-size: 1.1rem;
        color: #666;
        margin-bottom: 30px;
      }

      .features .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-top: 30px;
      }

      .features .grid-item {
        background-color: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
      }

      .features .grid-item:hover {
        transform: translateY(-5px); /* Subtle hover effect */
      }

      .features .grid-item h4 {
        font-size: 1.5rem;
        margin-bottom: 10px;
        color: #333;
      }

      .features .grid-item p {
        font-size: 1rem;
        color: #666;
      }

      /* Footer Styles */
      footer {
        width: 100%;
        background-color: #333;
        color: #fff;
        text-align: center;
        padding: 20px;
        font-size: 0.9rem;
        margin-top: 50px;
      }

      footer p {
        margin: 0;
      }

      footer a {
        color: #ff6f61; /* Vibrant accent color */
        text-decoration: none;
        transition: color 0.3s ease;
      }

      footer a:hover {
        color: #ff4a3d; /* Darker shade on hover */
      }
    </style>
  </head>
  <body>
   


    <!-- Hero Section -->
    <section class="hero">
      <h1>Welcome to ${process.env.AppName}</h1>
      <h2>Discover the best pepole and new thing, share your experiences, and let the good times roll!</h2>
      <button class="cta-button">Explore Now</button>
    </section>
  </body>
</html>
`;
