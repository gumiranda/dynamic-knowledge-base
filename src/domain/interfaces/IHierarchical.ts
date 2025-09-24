export interface IHierarchical {
  parentId?: string;
  getChildren(): Promise<IHierarchical[]>;
  getParent(): Promise<IHierarchical | null>;
}