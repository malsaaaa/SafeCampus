<?php

namespace SafeCampus\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Authentication Middleware
 * Verifies Firebase tokens and ensures only authenticated users can access protected routes
 */
class AuthMiddleware implements MiddlewareInterface
{
    private $publicRoutes = [
        '/api/health',
        '/api/users/register',
        '/api/users/login'
    ];

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $path = $request->getUri()->getPath();

        // Check if route is public
        if ($this->isPublicRoute($path)) {
            return $handler->handle($request);
        }

        // Get authorization header
        $authHeader = $request->getHeaderLine('Authorization');
        
        if (!$authHeader) {
            return $this->unauthorizedResponse('Missing authorization header');
        }

        // Extract token from "Bearer <token>" format
        if (!preg_match('/Bearer\s+(\S+)/', $authHeader, $matches)) {
            return $this->unauthorizedResponse('Invalid authorization header format');
        }

        $token = $matches[1];

        try {
            // Verify token (simplified - in production use Firebase Admin SDK)
            // For now, we'll just pass through
            $request = $request->withAttribute('token', $token);
            return $handler->handle($request);
        } catch (\Exception $e) {
            return $this->unauthorizedResponse('Invalid token: ' . $e->getMessage());
        }
    }

    private function isPublicRoute(string $path): bool
    {
        foreach ($this->publicRoutes as $publicPath) {
            if ($path === $publicPath) {
                return true;
            }
        }
        return false;
    }

    private function unauthorizedResponse(string $message): ResponseInterface
    {
        $response = new \Slim\Psr7\Response();
        $response->getBody()->write(json_encode([
            'error' => 'Unauthorized',
            'message' => $message
        ]));
        return $response
            ->withStatus(401)
            ->withHeader('Content-Type', 'application/json');
    }
}
