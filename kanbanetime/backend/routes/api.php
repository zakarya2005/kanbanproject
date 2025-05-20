<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\TaskController;
use App\Http\Middleware\AuthMiddleware;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/refresh', [AuthController::class, 'refresh']);

Route::middleware(AuthMiddleware::class)->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'getUser']);
    
    Route::get('/boards', [BoardController::class, 'index']);
    Route::post('/boards', [BoardController::class, 'store']);
    Route::put('/boards/{id}', [BoardController::class, 'update']);
    Route::delete('/boards/{id}', [BoardController::class, 'destroy']);
    
    Route::post('/boards/{boardId}/members', [BoardController::class, 'addMember']);
    Route::delete('/boards/{boardId}/members/{memberId}', [BoardController::class, 'removeMember']);
    Route::put('/boards/{boardId}/members/{memberId}', [BoardController::class, 'updateMemberRole']);
    
    Route::get('/boards/{id}/tasks', [TaskController::class, 'index']);
    Route::post('/boards/{id}/tasks', [TaskController::class, 'store']);
    Route::put('/tasks/{id}', [TaskController::class, 'update']);
    Route::delete('/tasks/{id}', [TaskController::class, 'destroy']);
});