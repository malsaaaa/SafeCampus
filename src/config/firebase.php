<?php

namespace SafeCampus\Config;

use Kreait\Firebase\Factory;
use Kreait\Firebase\ServiceAccount;

class Firebase
{
    private static $instance = null;

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = self::initialize();
        }
        return self::$instance;
    }

    private static function initialize()
    {
        $projectId = $_ENV['FIREBASE_PROJECT_ID'] ?? null;
        
        if (!$projectId) {
            throw new \Exception('Firebase Project ID not configured');
        }

        // Service account JSON - download from Firebase Console
        $serviceAccountPath = __DIR__ . '/../../firebase-service-account.json';
        
        if (!file_exists($serviceAccountPath)) {
            throw new \Exception('firebase-service-account.json not found at ' . $serviceAccountPath);
        }

        $serviceAccount = ServiceAccount::fromJsonFile($serviceAccountPath);
        
        $factory = (new Factory)
            ->withServiceAccount($serviceAccount)
            ->withDatabaseUri($_ENV['FIREBASE_DATABASE_URL']);

        return $factory->create();
    }

    public static function getDatabase()
    {
        return self::getInstance()->getDatabase();
    }

    public static function getAuth()
    {
        return self::getInstance()->getAuth();
    }

    public static function getStorage()
    {
        return self::getInstance()->getStorage();
    }

    public static function getFirestore()
    {
        return self::getInstance()->getFirestore();
    }
}
