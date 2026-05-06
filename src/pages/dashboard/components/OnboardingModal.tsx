import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { clientService, lineItemService, settingsService, invoiceService } from '@/services';
import { Settings, InvoiceStatusEnum } from '@/types/girilog';

interface OnboardingModalProps {
  settings: Settings | null;
  onDismiss: () => void;
  onRefreshSettings: () => void;
}

export default function OnboardingModal({ settings, onDismiss, onRefreshSettings }: OnboardingModalProps) {
  const navigate = useNavigate();
  const [hasClients, setHasClients] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  const [hasGoal, setHasGoal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showLogTime, setShowLogTime] = useState(false);
  const [showSetGoal, setShowSetGoal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', company: '' });
  const [timeForm, setTimeForm] = useState({ description: '', hours: 1 });
  const [goalForm, setGoalForm] = useState({ amount: 10000 });
  const [savingClient, setSavingClient] = useState(false);
  const [savingTime, setSavingTime] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [clientError, setClientError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [goalError, setGoalError] = useState('');

  const handleDismiss = useCallback(async () => {
    try {
      await settingsService.dismissOnboarding(settings?.id);
      onRefreshSettings();
      onDismiss();
    } catch (err) {
      console.error('Error dismissing onboarding:', err);
      // Still dismiss locally even if server call fails to avoid UI lock
      onDismiss();
    }
  }, [onDismiss, onRefreshSettings, settings?.id]);

  const handleSkip = useCallback(async () => {
    try {
      await settingsService.dismissOnboarding(settings?.id);
      onRefreshSettings();
      onDismiss();
    } catch (err) {
      console.error('Error skipping onboarding:', err);
      // Still dismiss locally even if server call fails to avoid UI lock
      onDismiss();
    }
  }, [onDismiss, onRefreshSettings, settings?.id]);

  const checkProgress = useCallback(async () => {
    try {
      const [clients, lineItems] = await Promise.all([
        clientService.getClients(),
        lineItemService.getAll(),
      ]);

      setHasClients((clients || []).length > 0);
      setHasTime((lineItems || []).length > 0);
      setHasGoal(Number(settings?.annual_revenue_goal) > 0);
    } catch (err) {
      console.error('Error checking onboarding progress:', err);
    } finally {
      setLoading(false);
    }
  }, [settings?.annual_revenue_goal]);

  useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  useEffect(() => {
    if (showCelebration) {
      // Trigger confetti
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const confettiInterval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(confettiInterval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      // Countdown
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(confettiInterval);
        clearInterval(countdownInterval);
      };
    }
  }, [showCelebration]);

  useEffect(() => {
    if (showCelebration && countdown === 0) {
      handleDismiss();
    }
  }, [showCelebration, countdown, handleDismiss]);

  if (loading || !settings || settings.onboarding_dismissed) return null;

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) {
      setClientError('Client name is required');
      return;
    }

    setSavingClient(true);
    setClientError('');
    try {
      await clientService.create({
        name: clientForm.name.trim(),
        company: clientForm.company.trim() || null,
        tax_enabled: false,
        default_tax_rate: 0,
        default_hourly_rate: 50,
        show_date: false,
        show_project: false,
        projects: [],
      });
      setShowAddClient(false);
      await checkProgress();
    } catch (err) {
      console.error('Error creating client during onboarding:', err);
      setClientError('Failed to create client. Please try again.');
    } finally {
      setSavingClient(false);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeForm.description.trim()) {
      setTimeError('Description is required');
      return;
    }

    setSavingTime(true);
    setTimeError('');
    try {
      const clients = await clientService.getClients();
      if (!clients || clients.length === 0) {
        setTimeError('No client found. Please create a client first.');
        return;
      }

      // Use the most recently created client
      const currentClient = clients[0];

      // 1. Find or create a WIP (Draft) invoice for this client
      let wipInvoice = await invoiceService.getDraftInvoiceForClient(currentClient.id);
      let invoiceId: number;

      if (!wipInvoice) {
        const invoiceNumber = await invoiceService.getNextInvoiceNumber(currentClient.id, currentClient.short_code || undefined);
        const today = new Date().toISOString().split('T')[0];
        const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

        const newInvoice = await invoiceService.create({
          invoice_number: invoiceNumber,
          client_id: currentClient.id,
          client_name: currentClient.name,
          client_email: currentClient.email,
          client_address: currentClient.address,
          status: InvoiceStatusEnum.Draft,
          issue_date: today,
          due_date: thirtyDays,
          subtotal: 0,
          tax_rate: currentClient.tax_enabled ? currentClient.default_tax_rate : 0,
          tax_amount: 0,
          discount_rate: 0,
          total: 0,
        });
        invoiceId = newInvoice.id;
      } else {
        invoiceId = wipInvoice.id;
      }

      // 2. Add line item
      const qty = timeForm.hours;
      const unitPrice = currentClient.default_hourly_rate || 0;
      const amount = qty * unitPrice;

      await lineItemService.create({
        invoice_id: invoiceId,
        date: new Date().toISOString().split('T')[0],
        description: timeForm.description.trim(),
        quantity: qty,
        unit_price: unitPrice,
        amount: amount,
        project: null,
      });

      // 3. Update invoice totals
      const allItems = await lineItemService.getLineItemsByInvoice(invoiceId);
      const newSubtotal = (allItems || []).reduce((sum, item) => sum + (item.amount || 0), 0);

      const currentInv = await invoiceService.getById(invoiceId);
      const taxRate = currentInv?.tax_rate || 0;
      const discountRate = currentInv?.discount_rate || 0;
      const taxAmount = newSubtotal * (taxRate / 100);
      const discountAmount = newSubtotal * (discountRate / 100);
      const newTotal = newSubtotal + taxAmount - discountAmount;

      await invoiceService.updateTotals(invoiceId, newSubtotal, taxAmount, newTotal);

      // 4. Mark invoice as sent
      await invoiceService.update(invoiceId, { status: InvoiceStatusEnum.Sent });

      setShowLogTime(false);
      await checkProgress();
    } catch (err) {
      console.error('Error logging time during onboarding:', err);
      setTimeError('Failed to log time. Please try again.');
    } finally {
      setSavingTime(false);
    }
  };

  const handleSetGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (goalForm.amount <= 0) {
      setGoalError('Goal must be greater than 0');
      return;
    }

    setSavingGoal(true);
    setGoalError('');
    try {
      await settingsService.update(settings.id, {
        annual_revenue_goal: goalForm.amount
      });
      setShowSetGoal(false);
      onRefreshSettings();
      await checkProgress();
      onRefreshSettings();

      // If this was the last step, show celebration
      if (hasClients && hasTime) {
        setShowCelebration(true);
      } else {
        // Fallback check if state wasn't updated yet but we know we just set the goal
        const hasClientsNow = hasClients;
        const hasTimeNow = hasTime;
        if (hasClientsNow && hasTimeNow) {
          setShowCelebration(true);
        }
      }
    } catch (err) {
      console.error('Error setting goal during onboarding:', err);
      setGoalError('Failed to save goal. Please try again.');
    } finally {
      setSavingGoal(false);
    }
  };


  const steps = [
    {
      id: 1,
      title: 'Create a client',
      description: 'Add your first client to start tracking work.',
      completed: hasClients,
      action: () => setShowAddClient(true),
      icon: 'ri-user-add-line',
    },
    {
      id: 2,
      title: 'Add tracked time',
      description: 'Log hours for your client to generate invoices.',
      completed: hasTime,
      action: () => setShowLogTime(true),
      icon: 'ri-time-line',
    },
    {
      id: 3,
      title: 'Add a yearly goal',
      description: 'Set a revenue target to track your progress.',
      completed: hasGoal,
      action: () => setShowSetGoal(true),
      icon: 'ri-trophy-line',
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;


  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0A0C10] border border-[#1E2330] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-8">
          {showCelebration ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="ri-tada-fill text-5xl text-primary animate-bounce" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Tada! 🎉</h2>
              <div className="mb-8">
                <p className="text-secondary text-lg">
                  You're all set up and ready to go!
                </p>
                <p className="text-primary font-mono text-sm mt-2">
                  Redirecting in {countdown}...
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="px-8 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
              >
                Let's get started
              </button>
            </div>
          ) : !showAddClient && !showLogTime && !showSetGoal ? (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome to GiriLog!</h2>
                  <p className="text-secondary">Let's get you set up and ready to bill.</p>
                </div>
                <button
                  onClick={handleSkip}
                  className="text-secondary hover:text-white transition-colors p-1"
                  title="Dismiss onboarding"
                >
                  <i className="ri-close-line text-2xl" />
                </button>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-mono text-secondary uppercase tracking-wider">Setup Progress</span>
                  <span className="text-xs font-mono text-primary">{completedCount}/{steps.length} steps</span>
                </div>
                <div className="h-2 bg-[#1E2330] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => {
                  const isPreviousStepCompleted = index === 0 || steps[index - 1].completed;
                  const isDisabled = !step.completed && !isPreviousStepCompleted;

                  return (
                    <div
                      key={step.id}
                      onClick={(step.completed || isDisabled) ? undefined : step.action}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        step.completed 
                          ? 'bg-primary/5 border-primary/20 cursor-default' 
                          : isDisabled
                            ? 'bg-[#161B26]/50 border-[#1E2330] cursor-not-allowed opacity-50'
                            : 'bg-[#161B26] border-[#1E2330] hover:border-primary/50 cursor-pointer group'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        step.completed 
                          ? 'bg-primary text-white' 
                          : isDisabled
                            ? 'bg-[#1E2330] text-secondary/30'
                            : 'bg-[#1E2330] text-secondary group-hover:text-primary transition-colors'
                      }`}>
                        <i className={`${step.completed ? 'ri-check-line' : step.icon} text-lg`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold ${
                          step.completed 
                            ? 'text-white/60 line-through' 
                            : isDisabled
                              ? 'text-white/30'
                              : 'text-white'
                        }`}>
                          {step.title}
                        </h3>
                        <p className={`text-sm truncate ${isDisabled ? 'text-secondary/30' : 'text-secondary'}`}>
                          {step.description}
                        </p>
                      </div>
                      {!step.completed && !isDisabled && (
                        <i className="ri-arrow-right-s-line text-secondary group-hover:text-primary transition-colors" />
                      )}
                      {isDisabled && (
                        <i className="ri-lock-line text-secondary/30" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSkip}
                  className="text-sm text-secondary hover:text-white transition-colors font-medium"
                >
                  Skip for now
                </button>
              </div>
            </>
          ) : showLogTime ? (
            <form onSubmit={handleLogTime}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Add tracked time</h2>
                  <p className="text-secondary">Log your first hours of work.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogTime(false)}
                  className="text-secondary hover:text-white transition-colors p-1"
                >
                  <i className="ri-close-line text-2xl" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">
                    Description <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={timeForm.description}
                    onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                    placeholder="e.g. Initial consultation and setup"
                    className="w-full bg-[#0D0F14] border border-[#1E2330] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-primary/50 transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={timeForm.hours}
                    onChange={(e) => setTimeForm({ ...timeForm, hours: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0D0F14] border border-[#1E2330] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                {timeError && (
                  <p className="text-xs text-[#EF4444] mt-2">{timeError}</p>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogTime(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#1E2330] text-white text-sm font-medium hover:bg-[#1E2330] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTime}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {savingTime ? 'Saving...' : 'Log Time'}
                </button>
              </div>
            </form>
          ) : showSetGoal ? (
            <form onSubmit={handleSetGoal}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Set your revenue goal</h2>
                  <p className="text-secondary">What is your target revenue for the year?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSetGoal(false)}
                  className="text-secondary hover:text-white transition-colors p-1"
                >
                  <i className="ri-close-line text-2xl" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">
                    Yearly Revenue Goal ($) <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={goalForm.amount}
                    onChange={(e) => setGoalForm({ ...goalForm, amount: parseInt(e.target.value) || 0 })}
                    placeholder="10000"
                    className="w-full bg-[#0D0F14] border border-[#1E2330] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-primary/50 transition-colors"
                    autoFocus
                  />
                  <p className="text-[11px] text-secondary mt-2">
                    Setting a goal helps you stay motivated and track your progress on the dashboard.
                  </p>
                </div>

                {goalError && (
                  <p className="text-xs text-[#EF4444] mt-2">{goalError}</p>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSetGoal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#1E2330] text-white text-sm font-medium hover:bg-[#1E2330] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGoal}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {savingGoal ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateClient}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Add your first client</h2>
                  <p className="text-secondary">Just the basics to get started.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="text-secondary hover:text-white transition-colors p-1"
                >
                  <i className="ri-close-line text-2xl" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">
                    Client Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-[#0D0F14] border border-[#1E2330] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-primary/50 transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={clientForm.company}
                    onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })}
                    placeholder="e.g. Acme Industries Inc."
                    className="w-full bg-[#0D0F14] border border-[#1E2330] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                {clientError && (
                  <p className="text-xs text-[#EF4444] mt-2">{clientError}</p>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#1E2330] text-white text-sm font-medium hover:bg-[#1E2330] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClient}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {savingClient ? 'Saving...' : 'Create Client'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
