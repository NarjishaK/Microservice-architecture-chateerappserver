# ChatterApp - Microservices Architecture

## Overview
ChatterApp is a microservices-based chat application that consists of multiple services handling authentication, user management, and API gateway functionalities. This project is designed to be scalable, modular, and efficient.

## Project Structure
```
chatterapp/
│-- api-gateway/       # API Gateway to route requests
│   │-- app.js         # Main entry point for API Gateway
│   │-- package.json   # Dependencies for API Gateway
│   └-- .env           # Environment variables for API Gateway
│
│-- authservices/      # Authentication Service
│   │-- controllers/   # Controllers for authentication logic
│   │-- routes/        # Authentication routes
│   │-- models/        # Database models
│   │-- middleware/    # Middleware for authentication
│   │-- package.json   # Dependencies for Auth Service
│   └-- .env           # Environment variables for Auth Service
│
│-- userservice/       # User Management Service
│   │-- controllers/   # User-related business logic
│   │-- routes/        # User-related routes
│   │-- models/        # User database models
│   │-- package.json   # Dependencies for User Service
│   └-- .env           # Environment variables for User Service
│
│-- .gitignore         # Files to be ignored by Git
│-- README.md          # Project documentation
```

## Technologies Used
- **Node.js** with Express.js for backend services
- **MongoDB** for database storage
- **Docker** for containerization
- **JWT** for authentication
- **Nginx** (optional) as a reverse proxy
- **Redis** (optional) for caching

## Setup & Installation
### Prerequisites
- Install **Node.js** (v16 or later)
- Install **MongoDB**
- Install **Docker** (optional)

### Steps to Run Locally
1. Clone the repository:
   ```sh
   git clone https://github.com/NarjishaK/chateerappserver.git
   cd chateerappserver
   ```
2. Install dependencies for each service:
   ```sh
   cd api-gateway && npm install
   cd ../authservices && npm install
   cd ../userservice && npm install
   ```
3. Set up environment variables (`.env` files) for each service.
4. Start the services:
   ```sh
   cd api-gateway && npm start
   cd ../authservices && npm start
   cd ../userservice && npm start
   ```
5. API Gateway should be running on **http://localhost:5001**

## API Endpoints
### Authentication Service
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/register` | User registration |
| GET | `/auth/profile` | Get user profile |

### User Service
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/user/:id` | Get user details by ID |
| PUT | `/user/:id` | Update user details |

### API Gateway Routes
| Route | Redirects To |
|--------|------------|
| `/auth/*` | `http://localhost:5002/*` |
| `/user/*` | `http://localhost:5003/*` |

## Running with Docker
To run all services with Docker:
```sh
docker-compose up --build
```



## License
This project is licensed under the **MIT License**.

