<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TranscriptController;
use App\Http\Controllers\MeetingNotesController;

Route::post('/correct-transcript', [TranscriptController::class, 'correct']);
Route::post('/meeting-notes', [MeetingNotesController::class, 'generate']);
Route::post('/generate-meeting-notes', [MeetingNotesController::class, 'generate']);
