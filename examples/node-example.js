const LoopKit = require('../dist/loopkit.cjs.js');

// Initialize LoopKit
LoopKit.init('your-api-key-here', {
  debug: true,
  batchSize: 10,
  flushInterval: 30,
  onAfterTrack: (event, success) => {
    console.log(`Event ${event.name} ${success ? 'sent' : 'failed'}`);
  },
  onError: (error) => {
    console.error('LoopKit error:', error.message);
  },
});

// Example: Track server startup
LoopKit.track('server_startup', {
  server_id: 'web-01',
  environment: process.env.NODE_ENV || 'development',
});

// Example: Track user registration
function handleUserRegistration(userData) {
  // Identify the user
  LoopKit.identify(userData.id, {
    email: userData.email,
    signup_date: new Date().toISOString(),
    plan: userData.plan || 'free',
    source: userData.source || 'website',
  });

  // Track signup event
  LoopKit.track('user_signup', {
    method: userData.signup_method || 'email',
    referrer: userData.referrer,
    utm_source: userData.utm_source,
    utm_campaign: userData.utm_campaign,
  });

  console.log(`User ${userData.email} registered and tracked`);
}

// Example: Track API usage
function trackApiUsage(endpoint, userId, responseTime, statusCode) {
  LoopKit.track('api_request', {
    endpoint,
    user_id: userId,
    response_time_ms: responseTime,
    status_code: statusCode,
  });
}

// Example: Track business metrics
function trackBusinessMetric(metricName, value, metadata = {}) {
  LoopKit.track('business_metric', {
    metric_name: metricName,
    value,
    ...metadata,
  });
}

// Example: Batch track multiple events
function processBatchEvents() {
  const events = [
    {
      name: 'data_processed',
      properties: {
        records_count: 1500,
        processing_time_ms: 2300,
        source: 'csv_import',
      },
    },
    {
      name: 'email_sent',
      properties: {
        template: 'welcome',
        recipient_count: 50,
        campaign_id: 'onboarding_2024',
      },
    },
    {
      name: 'backup_completed',
      properties: {
        backup_size_mb: 125,
        backup_duration_s: 45,
        backup_type: 'incremental',
      },
    },
  ];

  LoopKit.trackBatch(events);
  console.log('Batch events queued for sending');
}

// Example usage
async function demoUsage() {
  console.log('Starting LoopKit Node.js demo...');

  // Simulate user registration
  await new Promise((resolve) => setTimeout(resolve, 100));
  handleUserRegistration({
    id: 'user_12345',
    email: 'demo@example.com',
    plan: 'pro',
    signup_method: 'email',
    source: 'marketing_campaign',
  });

  // Simulate API calls
  trackApiUsage('/api/users', 'user_12345', 150, 200);
  trackApiUsage('/api/data', 'user_12345', 300, 200);
  trackApiUsage('/api/reports', 'user_12345', 500, 200);

  // Track business metrics
  trackBusinessMetric('monthly_revenue', 5250.75, {
    currency: 'USD',
    month: '2024-01',
  });

  trackBusinessMetric('active_users', 1250, {
    period: 'daily',
    date: new Date().toISOString().split('T')[0],
  });

  // Process batch events
  processBatchEvents();

  // Show queue status
  console.log(`Current queue size: ${LoopKit.getQueueSize()} events`);

  // Manually flush events
  try {
    await LoopKit.flush();
    console.log('All events flushed successfully');
  } catch (error) {
    console.error('Failed to flush events:', error.message);
  }

  // Demonstrate group tracking
  LoopKit.group(
    'company_abc',
    {
      name: 'Acme Corporation',
      plan: 'enterprise',
      employee_count: 500,
      industry: 'technology',
    },
    'organization'
  );

  LoopKit.track('feature_used', {
    feature: 'advanced_analytics',
    user_role: 'admin',
    usage_count: 15,
  });

  console.log('Demo completed. Final queue size:', LoopKit.getQueueSize());
}

// Error handling example
function handleError() {
  try {
    // Simulate an error
    throw new Error('Something went wrong in the application');
  } catch (error) {
    // Track the error
    LoopKit.track('application_error', {
      error_message: error.message,
      error_stack: error.stack,
      context: 'demo_function',
      severity: 'error',
    });
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');

  if (LoopKit.getQueueSize() > 0) {
    console.log('Flushing remaining events...');
    try {
      await LoopKit.flush();
      console.log('Events flushed successfully');
    } catch (error) {
      console.error('Failed to flush events on shutdown:', error.message);
    }
  }

  process.exit(0);
});

// Run the demo
if (require.main === module) {
  demoUsage()
    .then(() => {
      console.log('Demo finished successfully');
    })
    .catch((error) => {
      console.error('Demo failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  handleUserRegistration,
  trackApiUsage,
  trackBusinessMetric,
  processBatchEvents,
  handleError,
};
