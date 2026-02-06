# SafeCampus

A comprehensive campus safety application built with PHP and Firebase. SafeCampus provides user management, authentication, and administrative features for maintaining campus security and safety protocols.

## Features

- **User Authentication**: Secure user registration and login using Firebase Authentication
- **User Management**: Create, read, update, and delete user profiles
- **Admin Dashboard**: Administrative interface for managing users and viewing statistics
- **Role-Based Access**: Support for different user roles (admin, user)
- **RESTful API**: Complete REST API for all operations
- **Real-time Database**: Firebase Firestore for data persistence
- **Security Middleware**: Authentication middleware for protected routes

## Tech Stack

- **Backend**: PHP 8.0+
- **Framework**: Slim 4 (lightweight PHP framework)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Storage**: Google Cloud Storage
- **Testing**: PHPUnit

## Project Structure

```
SafeCampus/
├── public/                    # Public assets and entry point
│   ├── index.html            # Dashboard UI
│   ├── index.php             # Server entry point
│   ├── css/                  # Stylesheets
│   └── js/                   # Client-side JavaScript
├── src/                       # Application source code
│   ├── config/               # Configuration files
│   │   └── firebase.php      # Firebase setup and initialization
│   ├── controllers/          # Request handlers
│   │   ├── UserController.php        # User endpoints
│   │   └── AdminUserController.php   # Admin endpoints
│   ├── middleware/           # Express middleware
│   │   └── AuthMiddleware.php        # Authentication checks
│   ├── models/               # Data models
│   │   └── User.php          # User model with Firestore operations
│   └── routes/               # Route definitions
│       ├── api.php           # API routes
│       └── admin.php         # Admin routes
├── composer.json             # PHP dependencies
├── firebase-config.json      # Firebase configuration
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## Installation

### Prerequisites

- PHP 8.0 or higher
- Composer
- Firebase project account
- Service account credentials from Firebase Console

### Setup Steps

1. **Clone or download the project**
   ```bash
   cd SafeCampus
   ```

2. **Install PHP dependencies**
   ```bash
   composer install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update with your Firebase project details:
     ```
     FIREBASE_PROJECT_ID=your_project_id
     APP_DEBUG=true
     ```

4. **Add Firebase credentials**
   - Download `firebase-service-account.json` from Firebase Console
   - Place it in the project root directory

5. **Start the development server**
   ```bash
   php -S localhost:8000 -t public
   ```

6. **Access the application**
   - Visit `http://localhost:8000` in your browser

## API Endpoints

### User Endpoints

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/{userId}` - Get user profile

### Admin Endpoints

- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/search` - Search users
- `GET /api/admin/users/{userId}` - Get user details
- `PUT /api/admin/users/{userId}` - Update user
- `DELETE /api/admin/users/{userId}` - Delete user
- `GET /api/admin/statistics` - Get statistics and reports

### Health Check

- `GET /api/health` - API health status

## Authentication

The application uses Firebase Authentication with JWT tokens. Protected routes require a valid authentication token in the request header.

## Dependencies

Key PHP packages used:

- `kreait/firebase-php` - Firebase Admin SDK
- `vlucas/phpdotenv` - Environment variable management
- `slim/slim` - Web framework
- `slim/psr7` - PSR-7 HTTP messages
- `phpunit/phpunit` - Testing framework

## Configuration

### Firebase Setup

1. Create a Firebase project at https://firebase.google.com
2. Enable Authentication and Firestore
3. Generate a service account key from Project Settings
4. Update `firebase-config.json` with your credentials
5. Set `FIREBASE_PROJECT_ID` in `.env`

### Environment Variables

Create a `.env` file based on `.env.example`:

```
APP_DEBUG=true
FIREBASE_PROJECT_ID=your_project_id
```

## Development

### Running Tests

```bash
./vendor/bin/phpunit
```

### Code Structure

- **Controllers**: Handle HTTP requests and responses
- **Models**: Interact with Firestore database
- **Middleware**: Handle cross-cutting concerns like authentication
- **Routes**: Define API endpoints and map to controllers

## Security

- All passwords are hashed by Firebase Authentication
- Protected routes require valid authentication tokens
- Admin endpoints require admin role
- Input validation on all endpoints
- CORS headers for API access

## License

This project is part of the SafeCampus initiative.

## Support

For issues or questions, please contact the development team or create an issue in the project repository.
