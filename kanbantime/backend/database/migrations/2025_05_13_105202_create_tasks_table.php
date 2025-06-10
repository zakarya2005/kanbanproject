<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up() {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('content');
            $table->enum('status', ['todo', 'doing', 'done', 'stopped']);
            $table->unsignedBigInteger('board_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();
            $table->foreign('board_id')->references('id')->on('boards')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
