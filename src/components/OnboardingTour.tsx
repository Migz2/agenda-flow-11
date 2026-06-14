import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS, Step } from "react-joyride";

const STORAGE_KEY = "lovable_tour_completed_v1";

interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
}

type TourStep = Step & { page: string };

const STEPS: TourStep[] = [
  {
    target: '[data-tour="register-exam"]',
    page: "performance",
    title: "Diagnóstico inicial",
    content: "Bem-vindo! Todo grande plano começa com um diagnóstico. Registre seu edital ou meta principal aqui e adicione as matérias que você precisa estudar.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="generate-routine"]',
    page: "study",
    title: "Monte sua rotina",
    content: "Com suas matérias cadastradas, a IA pode montar seu calendário. Clique aqui para gerar sua rotina personalizada.",
    disableBeacon: true,
    placement: "top",
  },
  {
    target: '[data-tour="aihub-new"]',
    page: "aihub",
    title: "Simulado diagnóstico",
    content: "Crie um notebook e gere um quiz rápido. Suas respostas alimentarão suas métricas de desempenho automaticamente!",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="generate-routine"]',
    page: "study",
    title: "Fechando o ciclo",
    content: "Incrível! Agora que você já tem dados, clique em Gerar Rotina novamente e veja a mágica acontecer.",
    disableBeacon: true,
    placement: "top",
  },
];

export function OnboardingTour({ currentPage, onNavigate }: Props) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => {
        onNavigate(STEPS[0].page);
        setStepIndex(0);
        setRun(true);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [onNavigate]);

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(STORAGE_KEY);
      onNavigate(STEPS[0].page);
      setStepIndex(0);
      setRun(true);
    };
    window.addEventListener("tour:start", handler);
    return () => window.removeEventListener("tour:start", handler);
  }, [onNavigate]);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setRun(false);
    setStepIndex(0);
  };

  const callback = (data: CallBackProps) => {
    const { status, type, action, index } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      finish();
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      if (nextIndex >= STEPS.length || nextIndex < 0) {
        finish();
        return;
      }
      const next = STEPS[nextIndex];
      if (next.page !== currentPage) {
        // Pause, navigate, then resume on new page
        setRun(false);
        onNavigate(next.page);
        setTimeout(() => {
          setStepIndex(nextIndex);
          setRun(true);
        }, 400);
      } else {
        setStepIndex(nextIndex);
      }
    }
  };

  return (
    <Joyride
      steps={STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      callback={callback}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Pular tour",
      }}
      styles={{
        options: {
          arrowColor: "hsl(var(--card))",
          backgroundColor: "hsl(var(--card))",
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          overlayColor: "rgba(0,0,0,0.65)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 0 0 1px hsl(var(--border) / 0.4), 0 20px 60px -10px hsl(var(--primary) / 0.35)",
        },
        tooltipTitle: { fontSize: 16, fontWeight: 700 },
        tooltipContent: { fontSize: 14, lineHeight: 1.55 },
        buttonNext: { borderRadius: 12, padding: "8px 16px", fontWeight: 600 },
        buttonBack: { color: "hsl(var(--muted-foreground))" },
        buttonSkip: { color: "hsl(var(--muted-foreground))" },
      }}
    />
  );
}