<?php

namespace App\Http\Controllers;

use App\Models\User;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function login_user(User $user) {
        $payload = [
            'user_id' => $user->id,
            'iat' => time(),
            'exp' => time() + (env('ACCESS_TOKEN_EXPIRY_MINUTES') * 60),
        ];

        $refresh_payload = [
            'user_id' => $user->id,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24 * env('REFRESH_TOKEN_EXPIRY_DAYS')),
        ];

        $access_token = JWT::encode($payload, env('JWT_SECRET'), 'HS256');
        $refresh_token = JWT::encode($refresh_payload, env('JWT_REFRESH_SECRET'), 'HS256');
        $csrf_token = JWT::encode($payload, env('JWT_CSRF_SECRET'), 'HS256');

        return response()->json([
            'message' => 'User logged in successfully',
        ])->cookie(
            'access_token',
            $access_token,
            env('ACCESS_TOKEN_EXPIRY_MINUTES'),
            '/',
            null,
            env('PRODUCTION') === 'true',
            true,
            false,
            'lax'
        )->cookie(
            'refresh_token',
            $refresh_token,
            60 * 24 * env('REFRESH_TOKEN_EXPIRY_DAYS'),
            '/',
            null,
            env('PRODUCTION') === 'true',
            true,
            false,
            'lax'
        )->cookie(
            'csrf_token',
            $csrf_token,
            env('ACCESS_TOKEN_EXPIRY_MINUTES'),
            '/',
            null,
            env('PRODUCTION') === 'true',
            false,
            false,
            'lax'
        );
    }

    public function register(Request $request) {
        $validated = $request->validate([
            'username' => 'required|string|max:255',
            'email' => 'required|email',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if (!preg_match('/\d/', $validated['password'])) {
            return response()->json(["error" => "Password must contain at least 1 number"], 422);
        }

        if (!preg_match('/[a-z]/', $validated['password'])) {
            return response()->json(["error" => "Password must contain at least 1 lowercase letter"], 422);
        }

        if (!preg_match('/[A-Z]/', $validated['password'])) {
            return response()->json(["error" => "Password must contain at least 1 uppercase letter"], 422);
        }

        try {
            DB::beginTransaction();
            $user = User::create([
                'username' => $validated['username'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);
            DB::commit();
            
            return $this->login_user($user);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Registration failed',
                'details' => env('APP_DEBUG') ? $e->getMessage() : null
            ], 500);
        }
    }

    public function login(Request $request) {
        $validated = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $validated['username'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json(['error' => "Invalid Credentials"], 401);
        }

        return $this->login_user($user);
    }

    public function logout(Request $request)
    {
        return response()->json([
            'message' => 'Logged out successfully'
        ])->cookie('access_token', '', -1)
          ->cookie('refresh_token', '', -1)
          ->cookie('csrf_token', '', -1);
    }

    public function refresh(Request $request) {
        $refreshToken = $request->cookie('refresh_token');

        if (!$refreshToken) {
            return response()->json(['error' => 'No refresh token provided'], 401);
        }

        try {
            $decoded = JWT::decode($refreshToken, new Key(env('JWT_REFRESH_SECRET'), 'HS256'));
            
            $user = User::find($decoded->user_id);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            $payload = [
                'user_id' => $user->id,
                'iat' => time(),
                'exp' => time() + (env('ACCESS_TOKEN_EXPIRY_MINUTES') * 60),
            ];

            $new_access_token = JWT::encode($payload, env('JWT_SECRET'), 'HS256');
            $new_csrf_token = JWT::encode($payload, env('JWT_CSRF_SECRET'), 'HS256');

            return response()->json(['message' => 'Access token refreshed'])->cookie(
                'access_token',
                $new_access_token,
                env('ACCESS_TOKEN_EXPIRY_MINUTES'),
                '/',
                null,
                env('PRODUCTION') === 'true',
                true,
                false,
                'lax'
            )->cookie(
                'csrf_token',
                $new_csrf_token,
                env('ACCESS_TOKEN_EXPIRY_MINUTES'),
                '/',
                null,
                env('PRODUCTION') === 'true',
                false,
                false,
                'lax'
            );
        } catch (Exception $e) {
            return response()->json([
                'error' => 'Invalid refresh token',
                'details' => env('APP_DEBUG') ? $e->getMessage() : null
            ], 401);
        }
    }
    
    public function getUser(Request $request) {
        return $request->user();
    }
}