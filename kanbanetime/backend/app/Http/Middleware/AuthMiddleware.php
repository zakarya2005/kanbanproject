<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class AuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $access_token = $request->cookie('access_token');
        $csrf_token = $request->header('X-XSRF-TOKEN');

        if (!$access_token || !$csrf_token) {
            return response()->json([
                'error' => 'Unauthorized',
            ], 401);
        }

        try {
            $access_decoded = JWT::decode($access_token, new Key(env('JWT_SECRET'), 'HS256'));
            $csrf_decoded = JWT::decode($csrf_token, new Key(env('JWT_CSRF_SECRET'), 'HS256'));
        
            $access_userId = $access_decoded->user_id ?? null;
            $csrf_userId = $csrf_decoded->user_id ?? null;
        
            if (!$access_userId || !$csrf_userId || $access_userId !== $csrf_userId) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }
        
            if ($access_decoded->exp < time()) {
                return response()->json(['error' => 'Access token expired'], 401);
            }
        
            if ($csrf_decoded->exp < time()) {
                return response()->json(['error' => 'CSRF token expired'], 401);
            }
        
            $user = User::find($access_userId);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 401);
            }
        
            $request->setUserResolver(fn () => $user);
        
        } catch (Exception $e) {
            return response()->json(['error' => 'Invalid token: ' . $e->getMessage()], 401);
        }        

        return $next($request);
    }
}
