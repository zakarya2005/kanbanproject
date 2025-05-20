<?php

namespace App\Http\Controllers;

use Exception;
use App\Models\Board;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BoardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $boardIds = DB::table('board_members')
                ->where('user_id', $user->id)
                ->pluck('board_id');

            $boards = DB::table('boards')
                ->whereIn('id', $boardIds)
                ->get();

            return response()->json(['boards' => $boards], 200);
        } catch (Exception $e) {
            return response()->json([
                'error' => 'An error has occurred',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        try {
            $board = Board::create(['name' => $validated['name']]);

            DB::table('board_members')->insert([
                'board_id' => $board->id,
                'user_id' => $user->id,
                'role' => 'admin',
            ]);

            return response()->json(['board' => $board], 201);
        } catch (Exception $e) {
            return response()->json([
                'error' => 'Failed to create board',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        try {
            $isMember = DB::table('board_members')
                ->where('user_id', $user->id)
                ->where('board_id', $id)
                ->exists();

            if (!$isMember) {
                return response()->json(['error' => 'Forbidden'], 403);
            }

            $board = Board::findOrFail($id);
            $board->update(['name' => $validated['name']]);

            return response()->json(['board' => $board], 200);
        } catch (Exception $e) {
            return response()->json([
                'error' => 'Failed to update board',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $isMember = DB::table('board_members')
                ->where('user_id', $user->id)
                ->where('board_id', $id)
                ->exists();

            if (!$isMember) {
                return response()->json(['error' => 'Forbidden'], 403);
            }

            DB::table('board_members')->where('board_id', $id)->delete();
            Board::destroy($id);

            return response()->json(['message' => 'Board deleted'], 200);
        } catch (Exception $e) {
            return response()->json([
                'error' => 'Failed to delete board',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function addMember(Request $request, $boardId)
    {
        $user = $request->user();

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|in:admin,member,readOnly',
        ]);

        $isAdmin = DB::table('board_members')
            ->where('board_id', $boardId)
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->exists();

        if (!$isAdmin) {
            return response()->json(['error' => 'Only admins can add members'], 403);
        }

        try {
            DB::table('board_members')->updateOrInsert(
                ['board_id' => $boardId, 'user_id' => $validated['user_id']],
                ['role' => $validated['role'], 'updated_at' => now(), 'created_at' => now()]
            );

            return response()->json(['message' => 'Member added/updated successfully']);
        } catch (Exception $e) {
            return response()->json([
                'error' => 'Failed to add member',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function removeMember(Request $request, $boardId, $memberId)
    {
        $user = $request->user();

        $isAdmin = DB::table('board_members')
            ->where('board_id', $boardId)
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->exists();

        if ($user->id !== (int) $memberId && !$isAdmin) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        try {
            DB::table('board_members')
                ->where('board_id', $boardId)
                ->where('user_id', $memberId)
                ->delete();

            return response()->json(['message' => 'Member removed']);
        } catch (Exception $e) {
            return response()->json([
                'error' => 'Failed to remove member',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateMemberRole(Request $request, $boardId, $memberId)
    {
        $user = $request->user();

        $validated = $request->validate([
            'role' => 'required|in:admin,member,readOnly',
        ]);

        $isAdmin = DB::table('board_members')
            ->where('board_id', $boardId)
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->exists();

        if (!$isAdmin) {
            return response()->json(['error' => 'Only admins can update roles'], 403);
        }

        try {
            DB::table('board_members')
                ->where('board_id', $boardId)
                ->where('user_id', $memberId)
                ->update(['role' => $validated['role']]);

            return response()->json(['message' => 'Role updated']);
        } catch (Exception $e) {
            return response()->json([
                'error' => 'Failed to update role',
                'details' => $e->getMessage(),
            ], 500);
        }
    }
}
