<?php

namespace SafeCampus\Controllers;

use SafeCampus\Config\Firebase;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use DateTime;

class UserController
{
    /**
     * Register a new user
     */
    public function register(Request $request, Response $response): Response
    {
        $data = json_decode($request->getBody()->getContents(), true);
        
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $name = $data['name'] ?? null;

        if (!$email || !$password || !$name) {
            return $this->jsonResponse($response, 
                ['error' => 'Missing required fields (email, password, name)'], 400);
        }

        try {
            $auth = Firebase::getAuth();
            $userRecord = $auth->createUserWithEmailAndPassword($email, $password);
            
            // Store user profile in Firestore
            $firestore = Firebase::getFirestore();
            $firestore->collection('users')->document($userRecord->uid)->set([
                'name' => $name,
                'email' => $email,
                'created_at' => new DateTime(),
                'role' => 'user',
                'status' => 'active',
                'phone' => $data['phone'] ?? null,
                'avatar' => $data['avatar'] ?? null
            ]);

            return $this->jsonResponse($response, [
                'success' => true,
                'user_id' => $userRecord->uid,
                'message' => 'User registered successfully',
                'user' => [
                    'id' => $userRecord->uid,
                    'name' => $name,
                    'email' => $email,
                    'role' => 'user',
                    'status' => 'active'
                ]
            ], 201);
        } catch (\Exception $e) {
            return $this->jsonResponse($response, 
                ['error' => 'Registration failed: ' . $e->getMessage()], 400);
        }
    }

    /**
     * User login (for mobile/frontend)
     */
    public function login(Request $request, Response $response): Response
    {
        $data = json_decode($request->getBody()->getContents(), true);
        
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$password) {
            return $this->jsonResponse($response, 
                ['error' => 'Email and password required'], 400);
        }

        try {
            $auth = Firebase::getAuth();
            // Note: This is a simplified example. In production, use Firebase Admin SDK properly
            
            return $this->jsonResponse($response, [
                'success' => true,
                'message' => 'Login successful',
                'token' => 'sample-token-' . time()
            ], 200);
        } catch (\Exception $e) {
            return $this->jsonResponse($response, 
                ['error' => 'Login failed: ' . $e->getMessage()], 401);
        }
    }

    /**
     * Get user profile
     */
    public function getProfile(Request $request, Response $response, array $args): Response
    {
        $userId = $args['userId'] ?? null;

        if (!$userId) {
            return $this->jsonResponse($response, 
                ['error' => 'User ID required'], 400);
        }

        try {
            $firestore = Firebase::getFirestore();
            $userDoc = $firestore->collection('users')->document($userId)->snapshot();

            if (!$userDoc->exists()) {
                return $this->jsonResponse($response, 
                    ['error' => 'User not found'], 404);
            }

            return $this->jsonResponse($response, [
                'success' => true,
                'user' => array_merge(['id' => $userId], $userDoc->data())
            ], 200);
        } catch (\Exception $e) {
            return $this->jsonResponse($response, 
                ['error' => 'Failed to retrieve user: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get all users (Admin only)
     */
    public function getAllUsers(Request $request, Response $response): Response
    {
        try {
            $firestore = Firebase::getFirestore();
            $usersCollection = $firestore->collection('users')->documents();
            
            $users = [];
            foreach ($usersCollection as $userDoc) {
                $userData = $userDoc->data();
                $userData['id'] = $userDoc->id();
                $users[] = $userData;
            }

            return $this->jsonResponse($response, [
                'success' => true,
                'count' => count($users),
                'users' => $users
            ], 200);
        } catch (\Exception $e) {
            return $this->jsonResponse($response, 
                ['error' => 'Failed to retrieve users: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update user (Admin)
     */
    public function updateUser(Request $request, Response $response, array $args): Response
    {
        $userId = $args['userId'] ?? null;
        $data = json_decode($request->getBody()->getContents(), true);

        if (!$userId) {
            return $this->jsonResponse($response, 
                ['error' => 'User ID required'], 400);
        }

        try {
            $firestore = Firebase::getFirestore();
            $updateData = [];

            // Only allow specific fields to be updated
            $allowedFields = ['name', 'status', 'role', 'phone', 'avatar'];
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateData[$field] = $data[$field];
                }
            }

            if (empty($updateData)) {
                return $this->jsonResponse($response, 
                    ['error' => 'No valid fields to update'], 400);
            }

            $updateData['updated_at'] = new DateTime();
            
            $firestore->collection('users')->document($userId)->update($updateData);

            return $this->jsonResponse($response, [
                'success' => true,
                'message' => 'User updated successfully'
            ], 200);
        } catch (\Exception $e) {
            return $this->jsonResponse($response, 
                ['error' => 'Failed to update user: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete user (Admin)
     */
    public function deleteUser(Request $request, Response $response, array $args): Response
    {
        $userId = $args['userId'] ?? null;

        if (!$userId) {
            return $this->jsonResponse($response, 
                ['error' => 'User ID required'], 400);
        }

        try {
            $firestore = Firebase::getFirestore();
            $firestore->collection('users')->document($userId)->delete();

            return $this->jsonResponse($response, [
                'success' => true,
                'message' => 'User deleted successfully'
            ], 200);
        } catch (\Exception $e) {
            return $this->jsonResponse($response, 
                ['error' => 'Failed to delete user: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get user statistics (Admin)
     */
    public function getStatistics(Request $request, Response $response): Response
    {
        try {
            $firestore = Firebase::getFirestore();
            $usersCollection = $firestore->collection('users')->documents();
            
            $stats = [
                'total_users' => 0,
                'active_users' => 0,
                'inactive_users' => 0,
                'admins' => 0,
                'moderators' => 0,
                'regular_users' => 0
            ];

            foreach ($usersCollection as $userDoc) {
                $userData = $userDoc->data();
                $stats['total_users']++;
                
                if (($userData['status'] ?? null) === 'active') {
                    $stats['active_users']++;
                } else {
                    $stats['inactive_users']++;
                }

                $role = $userData['role'] ?? 'user';
                match ($role) {
                    'admin' => $stats['admins']++,
                    'moderator' => $stats['moderators']++,
                    default => $stats['regular_users']++
                };
            }

            return $this->jsonResponse($response, [
                'success' => true,
                'statistics' => $stats,
                'timestamp' => (new DateTime())->format('Y-m-d H:i:s')
            ], 200);
        } catch (\Exception $e) {
            return $this->jsonResponse($response, 
                ['error' => 'Failed to get statistics: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Search users (Admin)
     */
    public function searchUsers(Request $request, Response $response): Response
    {
        $query = $request->getQueryParams()['q'] ?? '';

        if (strlen($query) < 2) {
            return $this->jsonResponse($response, 
                ['error' => 'Search query must be at least 2 characters'], 400);
        }

        try {
            $firestore = Firebase::getFirestore();
            $usersCollection = $firestore->collection('users')->documents();
            
            $results = [];
            $query = strtolower($query);

            foreach ($usersCollection as $userDoc) {
                $userData = $userDoc->data();
                $name = strtolower($userData['name'] ?? '');
                $email = strtolower($userData['email'] ?? '');

                if (strpos($name, $query) !== false || strpos($email, $query) !== false) {
                    $userData['id'] = $userDoc->id();
                    $results[] = $userData;
                }
            }

            return $this->jsonResponse($response, [
                'success' => true,
                'count' => count($results),
                'results' => $results
            ], 200);
        } catch (\Exception $e) {
            return $this->jsonResponse($response, 
                ['error' => 'Search failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Helper: JSON response
     */
    private function jsonResponse(Response $response, array $data, int $statusCode = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response
            ->withStatus($statusCode)
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Access-Control-Allow-Origin', '*')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
}
