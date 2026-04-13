interface Step {
  number: number;
  label: string;
}

interface Props {
  currentStep: number;
  steps: Step[];
}

export function RegistrationStepper({ currentStep, steps }: Props) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
              ${currentStep > step.number
                ? 'bg-green-500 text-white'
                : currentStep === step.number
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-muted-foreground'}`}>
              {currentStep > step.number ? '✓' : step.number}
            </div>
            <span className="mt-1 text-xs text-muted-foreground">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`h-0.5 w-12 mx-1 mb-4 ${currentStep > step.number ? 'bg-green-600' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}