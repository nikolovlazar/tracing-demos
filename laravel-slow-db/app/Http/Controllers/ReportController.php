<?php

namespace App\Http\Controllers;

use App\Models\Habit;
use App\Models\HabitCompletion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $habits = $user->habits()->with(['completions' => function ($query) {
            $query->orderBy('completed_at', 'desc');
        }])->get();

        // Calculate periods
        $periods = [
            'last_week' => now()->subWeek()->startOfDay(),
            'last_month' => now()->subMonth()->startOfDay(),
            'last_year' => now()->subYear()->startOfDay(),
        ];

        // Start measuring query time
        $startTime = microtime(true);
        DB::enableQueryLog();

        // Intentionally slow query using multiple anti-patterns
        $completions = HabitCompletion::query()
            ->select('habit_completions.*')
            // Force table scan with function on column
            ->whereRaw('DATE_FORMAT(habit_completions.completed_at, "%Y-%m-%d") >= ?', [$periods['last_year']->format('Y-m-d')])
            // Correlated subquery instead of a simple join
            ->whereExists(function ($query) use ($user) {
                $query->select(\DB::raw(1))
                    ->from('habits as h2')
                    ->whereRaw('h2.id = habit_completions.habit_id')
                    ->where('h2.user_id', $user->id)
                    // Add some unnecessary date calculations
                    ->whereRaw('DAYOFWEEK(habit_completions.completed_at) BETWEEN 1 AND 7')
                    ->whereRaw('EXTRACT(HOUR FROM habit_completions.completed_at) BETWEEN 0 AND 23');
            })
            // Force MySQL to create temporary tables and filesort
            ->orderBy(DB::raw('(
                SELECT COUNT(*)
                FROM habit_completions as hc2
                WHERE hc2.habit_id = habit_completions.habit_id
                AND MONTH(hc2.completed_at) = MONTH(habit_completions.completed_at)
            )'))
            ->orderBy(DB::raw('CONCAT(
                WEEKDAY(completed_at),
                DATE_FORMAT(completed_at, "%Y-%m-%d"),
                HOUR(completed_at)
            )'))
            // Load relationship with inefficient subquery
            ->with(['habit' => function ($query) {
                $query->select('*')
                    ->selectRaw('(
                        SELECT COUNT(*)
                        FROM habit_completions
                        WHERE habit_id = habits.id
                        AND YEAR(completed_at) = YEAR(CURRENT_DATE)
                        AND QUARTER(completed_at) = QUARTER(CURRENT_DATE)
                    ) as quarterly_completions')
                    ->selectRaw('(
                        SELECT AVG(DAYOFYEAR(completed_at))
                        FROM habit_completions
                        WHERE habit_id = habits.id
                        AND YEAR(completed_at) = YEAR(CURRENT_DATE)
                    ) as avg_day_of_year');
            }])
            ->get();

        // Calculate query time
        $queryTime = (microtime(true) - $startTime) * 1000; // Convert to milliseconds
        DB::disableQueryLog();

        // Log only execution time
        Log::info(sprintf('Query execution time: %.2fms', $queryTime));

        // Format completions for response
        $completions = $completions
            ->unique('id')
            ->values()
            ->map(function ($completion) {
                return [
                    'id' => $completion->id,
                    'habit_id' => $completion->habit_id,
                    'completed_at' => $completion->completed_at,
                    'notes' => $completion->notes,
                    'habit' => [
                        'name' => $completion->habit->name,
                        'frequency' => $completion->habit->frequency,
                    ],
                ];
            })
            ->all();

        return Inertia::render('Reports', [
            'habits' => $habits,
            'periods' => $periods,
            'monthlyData' => $monthlyData ?? [],
            'completions' => $completions,
        ]);
    }
}
