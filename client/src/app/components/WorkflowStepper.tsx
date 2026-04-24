import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

interface WorkflowStepperProps {
  status: string;
}

export function WorkflowStepper({ status }: WorkflowStepperProps) {
  const steps = [
    { key: 'draft',          label: 'Uploaded',      icon: FileText },
    { key: 'pending_review', label: 'Pending Review', icon: Clock },
    { key: 'approved',       label: 'Approved',       icon: CheckCircle },
  ];

  const statusOrder = ['draft', 'pending_review', 'approved'];

  const getStepStatus = (stepKey: string) => {
    if (status === 'rejected') {
      const stepIndex = statusOrder.indexOf(stepKey);
      return stepIndex <= 1 ? 'completed' : 'rejected';
    }
    const currentIndex = statusOrder.indexOf(status);
    const stepIndex = statusOrder.indexOf(stepKey);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getStepColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed': return 'bg-green-500 border-green-500 text-white';
      case 'current':   return 'bg-blue-500 border-blue-500 text-white';
      case 'rejected':  return 'bg-red-500 border-red-500 text-white';
      default:          return 'bg-white border-slate-300 text-slate-400';
    }
  };

  const getLineColor = (index: number) => {
    const stepStatus = getStepStatus(steps[index].key);
    if (stepStatus === 'completed') return 'bg-green-500';
    if (stepStatus === 'current') return 'bg-gradient-to-r from-green-500 to-blue-500';
    return 'bg-slate-200';
  };

  if (status === 'rejected') {
    return (
      <div className="rounded-lg bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-red-900">Invoice Rejected</p>
            <p className="text-sm text-red-700">This invoice did not pass validation</p>
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
                      left: `${(100 / (steps.length - 1)) * index + 100 / (steps.length - 1) / 2}%`,
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