import { describe, it, expect } from 'vitest'
import { DASHBOARD_TABS, getVisibleTabs, type TabConfig } from '../tabConfig'

describe('tabConfig', () => {
  describe('DASHBOARD_TABS', () => {
    it('should have overview tab without role requirement', () => {
      const overview = DASHBOARD_TABS.find((t) => t.id === 'overview')
      expect(overview).toBeDefined()
      expect(overview?.minRole).toBeUndefined()
    })

    it('should have team tab requiring teamLead', () => {
      const team = DASHBOARD_TABS.find((t) => t.id === 'team')
      expect(team).toBeDefined()
      expect(team?.minRole).toBe('teamLead')
    })

    it('should have analytics tab requiring teamAdmin', () => {
      const analytics = DASHBOARD_TABS.find((t) => t.id === 'analytics')
      expect(analytics).toBeDefined()
      expect(analytics?.minRole).toBe('teamAdmin')
    })

    it('should have admin tab requiring orgAdmin', () => {
      const admin = DASHBOARD_TABS.find((t) => t.id === 'admin')
      expect(admin).toBeDefined()
      expect(admin?.minRole).toBe('orgAdmin')
    })
  })

  describe('getVisibleTabs', () => {
    it('should return only overview for user role', () => {
      const tabs = getVisibleTabs('user')
      expect(tabs.map((t) => t.id)).toEqual(['overview'])
    })

    it('should return overview for powerUser role', () => {
      const tabs = getVisibleTabs('powerUser')
      expect(tabs.map((t) => t.id)).toEqual(['overview'])
    })

    it('should return overview + team for teamLead role', () => {
      const tabs = getVisibleTabs('teamLead')
      expect(tabs.map((t) => t.id)).toEqual(['overview', 'team'])
    })

    it('should return overview + team + analytics for teamAdmin role', () => {
      const tabs = getVisibleTabs('teamAdmin')
      expect(tabs.map((t) => t.id)).toEqual(['overview', 'team', 'analytics'])
    })

    it('should return all tabs for orgAdmin role', () => {
      const tabs = getVisibleTabs('orgAdmin')
      expect(tabs.map((t) => t.id)).toEqual([
        'overview',
        'team',
        'analytics',
        'admin'
      ])
    })

    it('should return all tabs for globalAdmin role', () => {
      const tabs = getVisibleTabs('globalAdmin')
      expect(tabs.map((t) => t.id)).toEqual([
        'overview',
        'team',
        'analytics',
        'admin'
      ])
    })

    it('should return only overview for undefined role', () => {
      const tabs = getVisibleTabs(undefined)
      expect(tabs.map((t) => t.id)).toEqual(['overview'])
    })
  })
})
