import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import { addDays, format, subDays } from 'date-fns';
import { useState } from 'react';

interface Habit {
    id: number;
    name: string;
    description: string | null;
    frequency: 'daily' | 'weekly' | 'monthly';
    reminder_time: string | null;
    is_active: boolean;
    completions: Array<{
        id: number;
        completed_at: string;
        notes: string | null;
    }>;
}

interface Props {
    habits: Habit[];
}

export default function Track({ habits: initialHabits }: Props) {
    const [habits, setHabits] = useState(initialHabits);
    const [generating, setGenerating] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        description: '',
        frequency: 'daily',
        reminder_time: '',
    });

    const handleComplete = (habitId: number) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const habit = habits.find((h) => h.id === habitId);
        if (!habit) return;

        const isCompleted = habit.completions.some((c) => c.completed_at === today);

        // Optimistically update the UI
        setHabits((prevHabits) =>
            prevHabits.map((h) => {
                if (h.id === habitId) {
                    if (isCompleted) {
                        // Remove completion
                        return {
                            ...h,
                            completions: h.completions.filter((c) => c.completed_at !== today),
                        };
                    } else {
                        // Add completion
                        return {
                            ...h,
                            completions: [...h.completions, { id: Date.now(), completed_at: today, notes: null }],
                        };
                    }
                }
                return h;
            }),
        );

        // Send the completion data
        router.post(
            route('habits.complete', { habit: habitId }),
            {
                completed_at: today,
                notes: null,
            },
            {
                preserveScroll: true,
            },
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        Sentry.startSpan({ name: 'createHabit', op: 'http' }, () => {
            post(route('habits.store'), {
                preserveScroll: true,
                onSuccess: (page) => {
                    setHabits(page.props.habits as Habit[]);
                    reset();
                },
            });
        });
    };

    const generateRandomCompletions = () => {
        setGenerating(true);

        // Get dates for the last year
        const endDate = new Date();
        const startDate = subDays(endDate, 365);
        const dates = [];
        let currentDate = startDate;

        while (currentDate <= endDate) {
            dates.push(format(currentDate, 'yyyy-MM-dd'));
            currentDate = addDays(currentDate, 1);
        }

        // Prepare all completions
        const completions = [];

        // For each habit, randomly complete it on different dates
        for (const habit of habits) {
            // Determine completion probability based on frequency
            const probability = habit.frequency === 'daily' ? 0.7 : habit.frequency === 'weekly' ? 0.3 : 0.1;

            for (const date of dates) {
                if (Math.random() < probability) {
                    completions.push({
                        habit_id: habit.id,
                        completed_at: date,
                        notes: `Auto-generated completion for testing`,
                    });
                }
            }
        }

        // Send all completions in one request using Inertia's router
        router.post(
            route('habits.bulk-complete'),
            { completions },
            {
                preserveScroll: true,
                onSuccess: () => {
                    window.location.reload();
                },
                onFinish: () => {
                    setGenerating(false);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Track Habits', href: '/track' }]}>
            <Head title="Track Habits" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="mb-6 flex items-center justify-between">
                                <h1 className="text-2xl font-semibold">Track Your Habits</h1>
                                <Button
                                    variant="destructive"
                                    onClick={generateRandomCompletions}
                                    disabled={generating}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {generating ? '🔄 Generating...' : '🎲 Go Crazy! Generate Test Data'}
                                </Button>
                            </div>

                            <form onSubmit={handleSubmit} className="mb-8">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <Label htmlFor="name">Habit Name</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className={errors.name ? 'border-red-500' : ''}
                                        />
                                        {errors.name && <div className="mt-1 text-sm text-red-500">{errors.name}</div>}
                                    </div>
                                    <div>
                                        <Label htmlFor="frequency">Frequency</Label>
                                        <Select
                                            value={data.frequency}
                                            onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setData('frequency', value)}
                                        >
                                            <SelectTrigger className={errors.frequency ? 'border-red-500' : ''}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Daily</SelectItem>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.frequency && <div className="mt-1 text-sm text-red-500">{errors.frequency}</div>}
                                    </div>
                                    <div>
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            className={errors.description ? 'border-red-500' : ''}
                                        />
                                        {errors.description && <div className="mt-1 text-sm text-red-500">{errors.description}</div>}
                                    </div>
                                    <div>
                                        <Label htmlFor="reminder_time">Reminder Time</Label>
                                        <Input
                                            id="reminder_time"
                                            type="time"
                                            value={data.reminder_time}
                                            onChange={(e) => setData('reminder_time', e.target.value)}
                                            className={errors.reminder_time ? 'border-red-500' : ''}
                                        />
                                        {errors.reminder_time && <div className="mt-1 text-sm text-red-500">{errors.reminder_time}</div>}
                                    </div>
                                </div>
                                <Button type="submit" className="mt-4" disabled={processing}>
                                    {processing ? 'Adding...' : 'Add Habit'}
                                </Button>
                            </form>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {habits.map((habit) => (
                                    <Card key={habit.id}>
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                <span>{habit.name}</span>
                                                <Checkbox
                                                    checked={habit.completions.some((c) => c.completed_at === format(new Date(), 'yyyy-MM-dd'))}
                                                    onCheckedChange={() => handleComplete(habit.id)}
                                                    disabled={processing}
                                                />
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="mb-2 text-sm text-gray-500">{habit.description}</p>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-medium">Frequency:</span>
                                                <span className="capitalize">{habit.frequency}</span>
                                            </div>
                                            {habit.reminder_time && (
                                                <div className="mt-1 flex items-center gap-2 text-sm">
                                                    <span className="font-medium">Reminder:</span>
                                                    <span>{habit.reminder_time}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
