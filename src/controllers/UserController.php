<?php

namespace SafeCampus\Controllers;

use SafeCampus\Config\Firebase;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserController
{
    public function register(Request $request, Response $response): Response
    {
        $data = json_decode($request->getBody()->getContents(), true);
        
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $name = $data['name'] ?? null;

        if (!$email || !$password || !$name) {
            return $response
                ->withStatus(400)
                ->withHeader('Content-Type', 'application/json')
                ->write(json_encode(['error' => 'Missing required fields']));
        }

        try {
            $auth = Firebase::getAuth();
            $userRecord = $auth->createUserWithEmailAndPassword($email, $password);
            
            // Store user profile in Firestore
            $firestore = Firebase::getFirestore();
            $firestore->collection('users')->document($userRecord->uid)->set([
                'name' => $name,
                'email' => $email,
                'created_at' => new \DateTime(),
                'role' => 'user'
            ]);

            return $response
                ->withStatus(201)
                ->withHeader('Content-Type', 'application/json')
                ->write(json_encode([
                    'success' => true,
                    'user_id' => $userRecord->uid,
                    'message' => 'User registered successfully'
                ]));
        } catch (\Exception $e) {
            return $response
                ->withStatus(400)
                ->withHeader('Content-Type', 'application/json')
                ->write(json_encode(['error' => $e->getMessage()]));
        }
    }

    public function login(Request $request, Response $response): Response
    {
        $data = json_decode($request->getBody()->getContents(), true);
        
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$password) {
            return $response
                ->withStatus(400)
                ->withHeader('Content-Type', 'application/json')
                ->write(json_encode(['error' => 'Email and password required']));
        }

        try {
            $auth = Firebase::getAuth();
            $signInResult = $auth->signInWithEmailAndPassword($email, $password);
            
            return $response
                ->withStatus(200)
                ->withHeader('Content-Type', 'application/json')
                ->write(json_encode([
                    'success' => true,
                    'user_id' => $signInResult->firebaseUserId(),
                    'message' => 'Login successful'
                ]));
        } catch (\Exception $e) {
            return $response
                ->withStatus(401)
                ->withHeader('Content-Type', 'application/json')
                ->write(json_encode(['error' => 'Invalid credentials']));
        }
    }

    public function getProfile(Request $request, Response $response): Response
    {
        try {
            $userId = $request->getAttribute('userId');
            
            if (!$userId) {
                return $response
                    ->withStatus(401)
                    ->withHeader('Content-Type', 'application/json')
                    ->write(json_encode(['error' => 'Unauthorized']));
            }

            $firestore = Firebase::getFirestore();
            $userDoc = $firestore->collection('users')->document($userId)->snapshot();
            
            if (!$userDoc->exists()) {
                return $response
                    ->withStatus(404)
                    ->withHeader('Content-Type', 'application/json')
                    ->write(json_encode(['error' => 'User not found']));
            }

            return $response
                ->withStatus(200)
                ->withHeader('Content-Type', 'application/json')
                ->write(json_encode($userDoc->data()));
        } catch (\Exception $e) {
            return $response
                ->withStatus(500)
                ->withHeader('Content-Type', 'application/json')
                ->write(json_encode(['error' => $e->getMessage()]));
        }
    }
}
