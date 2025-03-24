import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { format } from 'date-fns';

interface Habit {
    id: number;
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    completions: {
        last_week: number;
        last_month: number;
        last_year: number;
        monthly: Array<{
            month: string;
            count: number;
        }>;
    };
}

interface Periods {
    last_week: string;
    last_month: string;
    last_year: string;
}

interface Completion {
    id: number;
    habit_id: number;
    completed_at: string;
    notes: string | null;
    habit: {
        name: string;
        frequency: string;
    };
}

interface Props {
    habits: Habit[];
    periods: Periods;
    completions?: Completion[];
}

export default function Reports({ habits, periods, completions = [] }: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Habit Reports', href: '/reports' }]}>
            <Head title="Habit Reports" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <h1 className="mb-6 text-2xl font-semibold">Habit Reports</h1>

                            <Tabs defaultValue="overview" className="space-y-4">
                                <TabsList>
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="history">Historical Data</TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="space-y-4">
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {habits.map((habit) => (
                                            <Card key={habit.id}>
                                                <CardHeader>
                                                    <CardTitle>{habit.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-500">Last Week</span>
                                                            <span className="font-medium">{habit.completions.last_week}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-500">Last Month</span>
                                                            <span className="font-medium">{habit.completions.last_month}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-500">Last Year</span>
                                                            <span className="font-medium">{habit.completions.last_year}</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 text-sm text-gray-500">
                                                        Frequency: <span className="capitalize">{habit.frequency}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    <div className="mt-8 text-sm text-gray-500">
                                        <p>Period start dates:</p>
                                        <ul className="list-inside list-disc">
                                            <li>Last Week: {format(new Date(periods.last_week), 'PPP')}</li>
                                            <li>Last Month: {format(new Date(periods.last_month), 'PPP')}</li>
                                            <li>Last Year: {format(new Date(periods.last_year), 'PPP')}</li>
                                        </ul>
                                    </div>
                                </TabsContent>

                                <TabsContent value="history" className="space-y-4">
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {habits.map((habit) => (
                                            <Card key={habit.id}>
                                                <CardHeader>
                                                    <CardTitle>{habit.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        {habit.completions.monthly?.map((month) => (
                                                            <div key={month.month} className="flex items-center justify-between">
                                                                <span className="text-sm text-gray-500">
                                                                    {format(new Date(month.month + '-01'), 'MMM yyyy')}
                                                                </span>
                                                                <span className="font-medium">{month.count}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-4 text-sm text-gray-500">
                                                        Frequency: <span className="capitalize">{habit.frequency}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </div>

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Habit Completions History</h2>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>All Completions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {completions.map((completion) => (
                                    <div key={completion.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                                        <div>
                                            <h3 className="font-medium">{completion.habit.name}</h3>
                                            <p className="text-sm text-gray-500">Completed on: {format(new Date(completion.completed_at), 'PPP')}</p>
                                        </div>
                                        <Badge variant="outline">{completion.habit.frequency}</Badge>
                                    </div>
                                ))}
                                {completions.length === 0 && <p className="py-4 text-center text-gray-500">No completions recorded yet.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
