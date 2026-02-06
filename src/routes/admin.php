<?php

use Slim\App;
use SafeCampus\Controllers\AdminUserController;

/**
 * Admin Dashboard API Routes
 * All routes require authentication
 */
return function (App $app) {
    
    // ================================================================
    // Admin User Management Routes
    // ================================================================
    
    /**
     * Get all users (Admin only)
     * GET /api/admin/users
     */
    $app->get('/api/admin/users', [AdminUserController::class, 'getAllUsers']);
    
    /**
     * Search users (Admin only)
     * GET /api/admin/users/search?q=query
     */
    $app->get('/api/admin/users/search', [AdminUserController::class, 'searchUsers']);
    
    /**
     * Get user by ID
     * GET /api/admin/users/{userId}
     */
    $app->get('/api/admin/users/{userId}', [AdminUserController::class, 'getProfile']);
    
    /**
     * Update user (Admin only)
     * PUT /api/admin/users/{userId}
     */
    $app->put('/api/admin/users/{userId}', [AdminUserController::class, 'updateUser']);
    
    /**
     * Delete user (Admin only)
     * DELETE /api/admin/users/{userId}
     */
    $app->delete('/api/admin/users/{userId}', [AdminUserController::class, 'deleteUser']);
    
    /**
     * Get user statistics (Admin only)
     * GET /api/admin/statistics
     */
    $app->get('/api/admin/statistics', [AdminUserController::class, 'getStatistics']);
    
    // ================================================================
    // Health Check
    // ================================================================
    
    $app->get('/api/health', function ($request, $response) {
        $response->getBody()->write(json_encode(['status' => 'ok', 'timestamp' => date('Y-m-d H:i:s')]));
        return $response->withHeader('Content-Type', 'application/json');
    });
    
    // ================================================================
    // CORS Preflight Handler
    // ================================================================
    
    $app->options('/{routes:.+}', function ($request, $response) {
        return $response
            ->withHeader('Access-Control-Allow-Origin', '*')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            ->withStatus(200);
    });
};
