<?php

namespace App\Http\Controllers;

use App\Models\Habit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class HabitController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $habits = auth()->user()->habits()->with('completions')->get();
        return Inertia::render('Track', [
            'habits' => $habits
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'frequency' => 'required|in:daily,weekly,monthly',
            'reminder_time' => 'nullable|date_format:H:i',
        ]);

        $habit = auth()->user()->habits()->create($validated);
        $habits = auth()->user()->habits()->with('completions')->get();

        return redirect()->back()->with("success", [
            'habits' => $habits,
            'success' => 'Habit created successfully'
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Habit $habit)
    {
        $this->authorize('update', $habit);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'frequency' => 'required|in:daily,weekly,monthly',
            'reminder_time' => 'nullable|date_format:H:i',
            'is_active' => 'boolean',
        ]);

        $habit->update($validated);

        return redirect()->back()->with('success', 'Habit updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Habit $habit)
    {
        $this->authorize('delete', $habit);

        $habit->delete();

        return redirect()->back()->with('success', 'Habit deleted successfully');
    }

    public function complete(Request $request, Habit $habit)
    {
        \Log::info('Pre-auth in complete habit', [
            'habit_id' => $habit->id,
            'request_data' => $request->all(),
        ]);

        $this->authorize('complete', $habit);

        \Log::info('Completing habit', [
            'habit_id' => $habit->id,
            'request_data' => $request->all(),
        ]);

        \Log::info('Completed at', [
            'completed_at' => $request->input('completed_at'),
        ]);

        $validated = $request->validate([
            'completed_at' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        \Log::info('Validated data', [
            'validated' => $validated,
        ]);

        $completion = $habit->completions()->create([
            'completed_at' => $validated['completed_at'],
            'notes' => $validated['notes'] ?? null,
            'habit_id' => $habit->id
        ]);

        \Log::info('Created completion', [
            'completion' => $completion,
        ]);

        return redirect()->back()->with('success', 'Habit marked as completed');
    }

    public function bulkComplete(Request $request)
    {

        $validated = $request->validate([
            'completions' => 'required|array',
            'completions.*.habit_id' => 'required|exists:habits,id',
            'completions.*.completed_at' => 'required|date',
            'completions.*.notes' => 'nullable|string',
        ]);

        $user = auth()->user();
        $habits = $user->habits()->whereIn('id', collect($validated['completions'])->pluck('habit_id'))->get();

        // Authorize all habits
        foreach ($habits as $habit) {
            $this->authorize('complete', $habit);
        }

        // Bulk insert completions
        $completions = [];
        foreach ($validated['completions'] as $completion) {
            $completions[] = [
                'habit_id' => $completion['habit_id'],
                'completed_at' => $completion['completed_at'],
                'notes' => $completion['notes'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Insert in chunks to avoid memory issues
        foreach (array_chunk($completions, 1000) as $chunk) {
            \DB::table('habit_completions')->insert($chunk);
        }

        return redirect()->back()->with('success', count($completions) . ' completions created successfully');
    }
}
