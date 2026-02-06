<?php

use Slim\App;
use SafeCampus\Controllers\UserController;
use SafeCampus\Controllers\AdminUserController;

return function (App $app) {
    // ================================================================
    // Serve Dashboard HTML
    // ================================================================
    
    $app->get('/', function ($request, $response) {
        $filePath = __DIR__ . '/../../public/index.html';
        if (file_exists($filePath)) {
            $response->getBody()->write(file_get_contents($filePath));
            return $response->withHeader('Content-Type', 'text/html');
        }
        $response->getBody()->write('Dashboard not found at: ' . $filePath);
        return $response->withStatus(404);
    });
    
    // ================================================================
    // Public User Endpoints
    // ================================================================
    
    $app->post('/api/users/register', [UserController::class, 'register']);
    $app->post('/api/users/login', [UserController::class, 'login']);
    $app->get('/api/users/{userId}', [UserController::class, 'getProfile']);
    
    // ================================================================
    // Admin Endpoints
    // ================================================================
    
    // User Management
    $app->get('/api/admin/users', [AdminUserController::class, 'getAllUsers']);
    $app->get('/api/admin/users/search', [AdminUserController::class, 'searchUsers']);
    $app->get('/api/admin/users/{userId}', [AdminUserController::class, 'getProfile']);
    $app->put('/api/admin/users/{userId}', [AdminUserController::class, 'updateUser']);
    $app->delete('/api/admin/users/{userId}', [AdminUserController::class, 'deleteUser']);
    
    // Statistics & Reports
    $app->get('/api/admin/statistics', [AdminUserController::class, 'getStatistics']);
    
    // ================================================================
    // Health Check
    // ================================================================
    
    $app->get('/api/health', function ($request, $response) {
        $response->getBody()->write(json_encode([
            'status' => 'ok',
            'timestamp' => date('Y-m-d H:i:s'),
            'service' => 'SafeCampus Admin Dashboard API'
        ]));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(200);
    });
    
    // ================================================================
    // CORS Preflight Handling
    // ================================================================
    
    $app->options('/{routes:.+}', function ($request, $response) {
        return $response
            ->withHeader('Access-Control-Allow-Origin', '*')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            ->withStatus(200);
    });
};