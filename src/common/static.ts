interface Process {
    env: Record<string, string>;
}

type Lang = Record<string, Record<string, string>>;

export const process: Process = null as unknown as Process;

export const lang: Lang = null as unknown as Lang;
