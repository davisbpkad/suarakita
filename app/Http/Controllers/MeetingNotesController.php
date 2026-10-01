<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\MeetingNotesService;

class MeetingNotesController extends Controller
{
    protected MeetingNotesService $notesService;

    public function __construct(MeetingNotesService $notesService)
    {
        $this->notesService = $notesService;
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'text' => 'required|string',
            'apiKey' => 'nullable|string'
        ]);

        $apiKey = $validated['apiKey'] ?? config('services.gemini.key');
        $result = $this->notesService->generate($validated['text'], $apiKey);

        return response()->json($result);
    }
}
