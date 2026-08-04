export interface UCSectionHandle {
  save: () => Promise<void>;
  hasChanges: boolean;
}
