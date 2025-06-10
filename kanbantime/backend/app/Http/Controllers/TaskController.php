<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Exception;

class TaskController extends Controller
{
    public function index(Request $request, $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $isMember = DB::table('board_members')
            ->where('user_id', $user->id)
            ->where('board_id', $id)
            ->exists();

        if (!$isMember) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $tasks = DB::table('tasks')
            ->join('users', 'tasks.user_id', '=', 'users.id')
            ->where('tasks.board_id', $id)
            ->select('tasks.id', 'tasks.content', 'tasks.status', 'users.username')
            ->get();

        return response()->json(['tasks' => $tasks], 200);
    }

    public function store(Request $request, $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $membership = DB::table('board_members')
            ->where('user_id', $user->id)
            ->where('board_id', $id)
            ->first();

        if (!$membership || $membership->role === 'readOnly') {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:1000',
            'status' => ['required', Rule::in(['todo', 'doing', 'done', 'stopped'])],
        ]);

        try {
            $task = Task::create([
                'content' => $validated['content'],
                'status' => $validated['status'],
                'board_id' => $id,
                'user_id' => $user->id,
            ]);

            return response()->json(['task' => $task], 201);
        } catch (Exception $e) {
            return response()->json(['error' => 'Failed to create task', 'details' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $task = Task::find($id);

        if (!$task) {
            return response()->json(['error' => 'Task not found'], 404);
        }

        $membership = DB::table('board_members')
            ->where('user_id', $user->id)
            ->where('board_id', $task->board_id)
            ->first();

        if (!$membership || $membership->role === 'readOnly') {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:1000',
            'status' => ['required', Rule::in(['todo', 'doing', 'done', 'stopped'])],
        ]);

        try {
            $task->update([
                'content' => $validated['content'],
                'status' => $validated['status'],
            ]);

            return response()->json(['task' => $task], 200);
        } catch (Exception $e) {
            return response()->json(['error' => 'Failed to update task', 'details' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $task = Task::find($id);

        if (!$task) {
            return response()->json(['error' => 'Task not found'], 404);
        }

        $membership = DB::table('board_members')
            ->where('user_id', $user->id)
            ->where('board_id', $task->board_id)
            ->first();

        if (!$membership || $membership->role === 'readOnly') {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        try {
            $task->delete();
            return response()->json(['message' => 'Task deleted'], 200);
        } catch (Exception $e) {
            return response()->json(['error' => 'Failed to delete task', 'details' => $e->getMessage()], 500);
        }
    }
}
