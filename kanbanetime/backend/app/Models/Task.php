<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = [
        "content", "status", "user_id",
    ];

    public function board() {
        return $this->belongsTo(Board::class);
    }

    public function user() {
        return $this->belongsTo(User::class);
    }
}
