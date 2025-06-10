<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    protected $fillable = [
        'username', 'email', 'password',
    ];

    public function tasks() {
        return $this->hasMany(Board::class);
    }

    public function boards() {
        return $this->hasMany(Board::class);
    }
}
