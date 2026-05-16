import { CheckCircle, Clock, XCircle, FileText, DollarSign } from 'lucide-react';

interface WorkflowStepperProps {
  status: string;
  personal?: boolean;
}

export function WorkflowStepper({ status, personal }: WorkflowStepperProps) {
  const isPaid = status === 'paid';

  if (personal) {
    const steps = [
      { key: 'draft', label: 'Draft', icon: FileText },
      { key: 'paid',  label: 'Paid',  icon: DollarSign },
    ];
    const getPersonalStepColor = (stepKey: string) => {
      if (isPaid) return 'bg-green-500 border-green-500 text-white';
      if (stepKey === 'draft') return 'bg-blue-500 border-blue-500 text-white';
      return 'bg-white border-slate-300 text-slate-400 dark:bg-slate-800 dark:border-slate-600';
    };
    const getPersonalLabel = (stepKey: string) => {
      if (isPaid) return <p className="mt-1 text-xs text-muted-foreground">Completed</p>;
      if (stepKey === 'draft') return <p className="mt-1 text-xs font-medium text-blue-600">In Progress</p>;
      return null;
    };
    return (
      <div className="rounded-lg bg-card border p-6">
        <div className="relative flex items-start justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex flex-1 flex-col items-center">
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${getPersonalStepColor(step.key)}`}>
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${!isPaid && step.key === 'paid' ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {step.label}
                    </p>
                    {getPersonalLabel(step.key)}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-6 -z-0 h-0.5 ${isPaid ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-slate-200 dark:to-slate-700'}`}
                    style={{ left: '25%', right: '25%' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }


  const steps = [
    { key: 'draft',          label: 'Uploaded',      icon: FileText },
    { key: 'pending_review', label: 'Pending Review', icon: Clock },
    { key: 'approved',       label: 'Approved',       icon: CheckCircle },
    ...(isPaid ? [{ key: 'paid', label: 'Paid', icon: DollarSign }] : []),
  ];

  const statusOrder = ['draft', 'pending_review', 'approved', 'paid'];

  const getStepStatus = (stepKey: string) => {
    if (status === 'rejected') {
      const stepIndex = statusOrder.indexOf(stepKey);
      return stepIndex <= 1 ? 'completed' : 'rejected';
    }
    if (isPaid) return 'completed';

    const currentIndex = statusOrder.indexOf(status);
    const stepIndex    = statusOrder.indexOf(stepKey);

    if (status === 'approved' && stepKey === 'approved') return 'completed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getStepColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed': return 'bg-green-500 border-green-500 text-white';
      case 'current':   return 'bg-blue-500 border-blue-500 text-white';
      case 'rejected':  return 'bg-red-500 border-red-500 text-white';
      default:          return 'bg-white border-slate-300 text-slate-400 dark:bg-slate-800 dark:border-slate-600';
    }
  };

  const getLineColor = (index: number) => {
    const stepStatus = getStepStatus(steps[index].key);
    if (stepStatus === 'completed') return 'bg-green-500';
    if (stepStatus === 'current')   return 'bg-gradient-to-r from-green-500 to-blue-500';
    return 'bg-slate-200 dark:bg-slate-700';
  };

  if (status === 'rejected') {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-red-900 dark:text-red-300">Invoice Rejected</p>
            <p className="text-sm text-red-700 dark:text-red-400">This invoice did not pass validation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card border p-6">
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepStatus = getStepStatus(step.key);
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex flex-1 flex-col items-center">
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${getStepColor(stepStatus)}`}>
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${stepStatus === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {step.label}
                    </p>
                    {stepStatus === 'current' && (
                      <p className="mt-1 text-xs font-medium text-blue-600">In Progress</p>
                    )}
                    {stepStatus === 'completed' && (
                      <p className="mt-1 text-xs text-muted-foreground">Completed</p>
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-6 -z-0 h-0.5 ${getLineColor(index)}`}
                    style={{
                      left:  `${(100 / (steps.length - 1)) * index       + 100 / (steps.length - 1) / 2}%`,
                      right: `${100 - (100 / (steps.length - 1)) * (index + 1) + 100 / (steps.length - 1) / 2}%`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
