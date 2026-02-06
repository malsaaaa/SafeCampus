<?php

namespace SafeCampus\Models;

use SafeCampus\Config\Firebase;

class User
{
    private $firestore;

    public function __construct()
    {
        $this->firestore = Firebase::getFirestore();
    }

    public function create(string $userId, array $data): bool
    {
        try {
            $this->firestore->collection('users')->document($userId)->set($data);
            return true;
        } catch (\Exception $e) {
            throw new \Exception('Failed to create user: ' . $e->getMessage());
        }
    }

    public function findById(string $userId): ?array
    {
        try {
            $snapshot = $this->firestore->collection('users')->document($userId)->snapshot();
            return $snapshot->exists() ? $snapshot->data() : null;
        } catch (\Exception $e) {
            throw new \Exception('Failed to find user: ' . $e->getMessage());
        }
    }

    public function update(string $userId, array $data): bool
    {
        try {
            $this->firestore->collection('users')->document($userId)->update($data);
            return true;
        } catch (\Exception $e) {
            throw new \Exception('Failed to update user: ' . $e->getMessage());
        }
    }

    public function delete(string $userId): bool
    {
        try {
            $this->firestore->collection('users')->document($userId)->delete();
            return true;
        } catch (\Exception $e) {
            throw new \Exception('Failed to delete user: ' . $e->getMessage());
        }
    }

    public function getAllUsers(): array
    {
        try {
            $users = [];
            $documents = $this->firestore->collection('users')->documents();
            
            foreach ($documents as $doc) {
                $users[$doc->id()] = $doc->data();
            }
            
            return $users;
        } catch (\Exception $e) {
            throw new \Exception('Failed to fetch users: ' . $e->getMessage());
        }
    }
}
