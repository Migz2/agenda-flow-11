import { useEffect, useState } from "react";
import { Joyride, EVENTS, ACTIONS, type EventData, type Step, type Controls } from "react-joyride";

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
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="generate-routine"]',
    page: "study",
    title: "Monte sua rotina",
    content: "Com suas matérias cadastradas, a IA pode montar seu calendário. Clique aqui para gerar sua rotina personalizada.",
    placement: "top",
    skipBeacon: true,
  },
  {
    target: '[data-tour="aihub-new"]',
    page: "aihub",
    title: "Simulado diagnóstico",
    content: "Crie um notebook e gere um quiz rápido. Suas respostas alimentarão suas métricas de desempenho automaticamente!",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="generate-routine"]',
    page: "study",
    title: "Fechando o ciclo",
    content: "Incrível! Agora que você já tem dados, clique em Gerar Rotina novamente e veja a mágica acontecer.",
    placement: "top",
    skipBeacon: true,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const onEvent = (data: EventData, _controls: Controls) => {
    const { type, action, index } = data;

    if (action === ACTIONS.CLOSE || action === ACTIONS.SKIP || type === EVENTS.TOUR_END) {
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
        setRun(false);
        onNavigate(next.page);
        setTimeout(() => {
          setStepIndex(nextIndex);
          setRun(true);
        }, 450);
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
      onEvent={onEvent}
      options={{
        showProgress: true,
        overlayClickAction: false,
        buttons: ["back", "skip", "primary"],
        backgroundColor: "hsl(var(--card))",
        arrowColor: "hsl(var(--card))",
        primaryColor: "hsl(var(--primary))",
        textColor: "hsl(var(--foreground))",
        overlayColor: "rgba(0,0,0,0.65)",
        zIndex: 10000,
      }}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Pular tour",
      }}
    />
  );
}