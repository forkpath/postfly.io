import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorkspaceState {
  /**
   * 用户是否已选择过工作空间
   * 用于控制登录后是否显示工作空间选择页面
   */
  hasSelected: boolean
}

interface WorkspaceActions {
  /**
   * 标记用户已选择工作空间
   */
  markSelected: () => void
  /**
   * 重置工作空间选择状态（通常在退出登录时调用）
   */
  reset: () => void
}

const initialState: WorkspaceState = {
  hasSelected: false
}

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>()(
  persist(
    set => ({
      ...initialState,
      markSelected: () => set({ hasSelected: true }),
      reset: () => set(initialState)
    }),
    {
      name: 'workspace-storage'
    }
  )
)
