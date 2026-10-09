// ゲームの調整用定数。数値バランスはここを変更して調整する

export const INITIAL = {
  money: 10_000,
  ability: 20,
  heightRange: [150, 200], // cm
  weightRange: [45, 90], // kg（0.1kg 単位のランダム）
  jobId: 'none',
  condition: 100,
  fullness: 50,
} as const;

export const LIMITS = {
  // 能力値の上限（null = 上限なし）
  abilityMax: null as number | null,
  conditionMax: 100,
  fullnessMax: 100,
} as const;

export const ACCOUNT = {
  nameMinLength: 2,
  nameMaxLength: 12,
  passwordMinLength: 8,
  // bcrypt は 72 バイトを超える部分を無視するため、それ以上は受け付けない
  passwordMaxBytes: 72,
} as const;

export const STATUS = {
  // BMI の標準範囲。外れるとコンディションの回復量が減る
  bmiNormalRange: [18.5, 25],
  bmiOutOfRangeRecoveryRate: 0.5,
  // 満腹度がこの値未満で行動すると、コンディションが下がる
  lowFullnessThreshold: 20,
  lowFullnessConditionPenalty: 5,
} as const;

export const WORK = {
  // コンディションがこの値未満だと給料が減る
  lowConditionThreshold: 50,
  lowConditionSalaryRate: 0.5,
} as const;

export const REST = {
  powerRecovery: 50, // 身体パワー・頭脳パワーそれぞれの回復量
  conditionRecovery: 30, // BMI 補正前の値
  fullnessCost: 5,
} as const;

export const TRAINING = {
  // コンディションに応じた能力上昇の倍率（上から順に判定）。種目ごとの上昇量はマスタ（trainings.ts）で定義
  rateByCondition: [
    { minCondition: 80, rate: 1 },
    { minCondition: 50, rate: 0.6 },
    { minCondition: 0, rate: 0.3 },
  ],
} as const;

export const BODY = {
  minWeight: 30, // kg
  maxWeight: 200, // kg
  minHeight: 120, // cm
  maxHeight: 220, // cm
} as const;

export const SOUP_KITCHEN = {
  fullnessRecovery: 30,
} as const;

export const CHOHAN = {
  maxBet: 100_000,
} as const;

export const FIGHT = {
  powerCost: 30,
  fullnessCost: 15,
  // 戦闘力 = (身体合計 + 下記能力の合計) × コンディション補正
  extraWeightAbilities: ['power', 'speed', 'arm', 'leg'],
  winRateRange: [0.05, 0.95],
  prizePerPower: 10,
  loseConditionDamage: 30,
} as const;

export const JOB_LEVEL = {
  // 職業レベルの区切り（経験値）。1回働くと経験値 +1。左から Lv1, Lv2, ...
  expThresholds: [0, 10, 30, 60, 100],
} as const;
