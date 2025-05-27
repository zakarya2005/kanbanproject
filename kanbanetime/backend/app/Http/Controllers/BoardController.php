<?php

namespace App\Http\Controllers;

use Exception;
use App\Models\Board;
use App\Models\User;
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

    public function getMembers(Request $request, $id)
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

        $members = DB::table('board_members')
            ->join('users', 'board_members.user_id', '=', 'users.id')
            ->where('board_members.board_id', $id)
            ->select('board_members.role', 'users.id as user_id', 'users.username')
            ->get();

        return response()->json(['members' => $members], 200);
    }

    public function addMember(Request $request, $boardId)
    {
        $user = $request->user();

        // Fix the validation - check username exists in username field
        $validated = $request->validate([
            'username' => 'required|exists:users,username',
        ]);

        $isAdmin = DB::table('board_members')
            ->where('board_id', $boardId)
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->exists();

        if (!$isAdmin) {
            return response()->json(['error' => 'Only admins can add members'], 403);
        }

        // Find user by username
        $user_being_added = User::where('username', $validated['username'])->first();
        
        if (!$user_being_added) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $user_id = $user_being_added->id;

        // Check if user is already a member
        $existingMember = DB::table('board_members')
            ->where('board_id', $boardId)
            ->where('user_id', $user_id)
            ->exists();

        if ($existingMember) {
            return response()->json(['error' => 'User is already a member of this board'], 409);
        }

        try {
            DB::table('board_members')->insert([
                'board_id' => $boardId,
                'user_id' => $user_id,
                'role' => 'readOnly', // or 'member' - be consistent
            ]);

            return response()->json(['message' => 'Member added successfully'], 201);
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

        // Check if user is admin
        $isAdmin = DB::table('board_members')
            ->where('board_id', $boardId)
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->exists();

        // Check if user is trying to remove themselves
        $isSelfRemoval = $user->id == (int) $memberId;

        // Allow if user is admin OR if user is removing themselves
        if (!$isAdmin && !$isSelfRemoval) {
            return response()->json(['error' => 'Forbidden - You can only remove yourself or be an admin to remove others'], 403);
        }

        // If user is removing themselves and they are the only admin, prevent it
        if ($isSelfRemoval) {
            $userRole = DB::table('board_members')
                ->where('board_id', $boardId)
                ->where('user_id', $user->id)
                ->value('role');

            if ($userRole === 'admin') {
                $adminCount = DB::table('board_members')
                    ->where('board_id', $boardId)
                    ->where('role', 'admin')
                    ->count();

                if ($adminCount <= 1) {
                    return response()->json([
                        'error' => 'Cannot remove yourself - you are the only admin. Please assign another admin first or delete the board.'
                    ], 422);
                }
            }
        }

        try {
            $removed = DB::table('board_members')
                ->where('board_id', $boardId)
                ->where('user_id', $memberId)
                ->delete();

            if ($removed) {
                $message = $isSelfRemoval ? 'You have left the board' : 'Member removed';
                return response()->json(['message' => $message], 200);
            } else {
                return response()->json(['error' => 'Member not found in this board'], 404);
            }
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
