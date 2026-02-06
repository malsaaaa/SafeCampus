<?php

require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Slim\Factory\AppFactory;

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Create Slim app
$app = AppFactory::create();

// Add middleware
$app->addErrorMiddleware((bool)$_ENV['APP_DEBUG'], true, true);

// Register routes
$routes = require __DIR__ . '/../src/routes/api.php';
$routes($app);

// Run app
$app->run();
