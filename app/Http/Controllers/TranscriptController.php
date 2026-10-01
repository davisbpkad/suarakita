<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\TranscriptCorrectionService;

class TranscriptController extends Controller
{
    protected TranscriptCorrectionService $correctionService;

    public function __construct(TranscriptCorrectionService $correctionService)
    {
        $this->correctionService = $correctionService;
    }

    public function correct(Request $request)
    {
        $validated = $request->validate([
            'text' => 'required|string',
            'apiKey' => 'nullable|string'
        ]);

        $apiKey = $validated['apiKey'] ?? config('services.gemini.key');
        $result = $this->correctionService->correct($validated['text'], $apiKey);

        return response()->json($result);
    }
}
