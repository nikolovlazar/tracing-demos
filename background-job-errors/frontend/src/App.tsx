import type { Component } from 'solid-js';
import styles from './App.module.css';
import { createSignal } from 'solid-js';
import * as Sentry from '@sentry/solid';

type ReportType = 'financial' | 'marketing' | 'operations' | 'hr' | 'sales';

const App: Component = () => {
  // Fake data for the dashboard
  const metrics = [
    { title: 'Total Revenue', value: '$2.4M', change: '+12.5%' },
    { title: 'Active Users', value: '45.2K', change: '+8.3%' },
    { title: 'Conversion Rate', value: '3.2%', change: '+2.1%' },
    { title: 'Customer Satisfaction', value: '4.8/5', change: '+0.3' },
  ];

  // Fake data for the table
  const recentTransactions = [
    {
      id: 'TRX-001',
      date: '2024-03-25',
      customer: 'Acme Corp',
      amount: '$12,500',
      status: 'Completed',
    },
    {
      id: 'TRX-002',
      date: '2024-03-24',
      customer: 'TechStart Inc',
      amount: '$8,750',
      status: 'Completed',
    },
    {
      id: 'TRX-003',
      date: '2024-03-24',
      customer: 'Global Industries',
      amount: '$15,200',
      status: 'Processing',
    },
    {
      id: 'TRX-004',
      date: '2024-03-23',
      customer: 'Innovation Labs',
      amount: '$6,800',
      status: 'Completed',
    },
    {
      id: 'TRX-005',
      date: '2024-03-23',
      customer: 'Future Systems',
      amount: '$9,300',
      status: 'Failed',
    },
  ];

  const [isLoading, setIsLoading] = createSignal(false);
  const [response, setResponse] = createSignal<{
    message: string;
    timestamp: string;
    jobId: string;
  } | null>(null);
  const [selectedReportType, setSelectedReportType] =
    createSignal<ReportType>('financial');

  const handleGenerateReport = async () => {
    setIsLoading(true);
    Sentry.startSpan(
      {
        name: 'request_annual_report_generation',
        op: 'http.request',
        attributes: {
          'report.type': selectedReportType(),
        },
      },
      () => {
        // The span will be automatically finished when this function returns
        return fetch('http://localhost:8080/api/generate-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportType: selectedReportType(),
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              throw new Error('Failed to generate report');
            }
            const data = await res.json();
            setResponse(data);
          })
          .catch((error) => {
            console.error('Error generating report:', error);
            setResponse({
              message: 'Failed to generate report',
              timestamp: new Date().toISOString(),
              jobId: 'error',
            });
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    );
  };

  const reportTypes: { value: ReportType; label: string }[] = [
    { value: 'financial', label: 'Financial Report' },
    { value: 'marketing', label: 'Marketing Analytics' },
    { value: 'operations', label: 'Operations Overview' },
    { value: 'hr', label: 'HR & Personnel' },
    { value: 'sales', label: 'Sales Performance' },
  ];

  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <h1>Business Analytics Dashboard</h1>
      </header>

      <main class={styles.main}>
        <div class={styles.metricsGrid}>
          {metrics.map((metric) => (
            <div class={styles.metricCard}>
              <h3>{metric.title}</h3>
              <div class={styles.metricValue}>{metric.value}</div>
              <div class={styles.metricChange}>{metric.change}</div>
            </div>
          ))}
        </div>

        <div class={styles.reportSection}>
          <h2>Annual Report Generation</h2>
          <p>
            Generate a comprehensive annual report by processing all available
            data.
          </p>
          <div class={styles.reportOptions}>
            <label for='reportType'>Report Type:</label>
            <select
              id='reportType'
              value={selectedReportType()}
              onChange={(e) =>
                setSelectedReportType(e.currentTarget.value as ReportType)
              }
              disabled={isLoading()}
            >
              {reportTypes.map((type) => (
                <option value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <button
            class={`${styles.generateButton} ${
              isLoading() ? styles.loading : ''
            }`}
            onClick={handleGenerateReport}
            disabled={isLoading()}
          >
            {isLoading() ? 'Generating...' : 'Generate Annual Report'}
          </button>
          {response() && (
            <div class={styles.response}>
              <p>{response()?.message}</p>
              <small>Job ID: {response()?.jobId}</small>
            </div>
          )}
        </div>

        <div class={styles.tableSection}>
          <h2>Recent Transactions</h2>
          <div class={styles.tableContainer}>
            <table class={styles.dataTable}>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr>
                    <td>{transaction.id}</td>
                    <td>{transaction.date}</td>
                    <td>{transaction.customer}</td>
                    <td>{transaction.amount}</td>
                    <td>
                      <span
                        class={`${styles.status} ${
                          styles[transaction.status.toLowerCase()]
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
