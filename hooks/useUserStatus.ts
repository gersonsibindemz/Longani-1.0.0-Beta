import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAudioFilesSince, countUserAudioFiles } from '../utils/db';
import {
  isTrialActive,
  getTrialDaysRemaining,
  calculateMonthlyUsage,
  getCurrentUsagePeriod,
  getPlanLimits,
  TRIAL_MAX_FILES,
  TRIAL_MAX_FILE_SIZE_MB,
  TRIAL_MAX_DURATION_SECONDS,
} from '../utils/audioUtils';
import { AudioFile } from '../types';

export const useUserStatus = () => {
  const { profile } = useAuth();
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [trialUsageCount, setTrialUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateUsageAndLimits = async () => {
      if (!profile) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const usagePeriod = getCurrentUsagePeriod(profile);
        const audioFiles: AudioFile[] = await getAudioFilesSince(usagePeriod.start.toISOString());
        const usage = calculateMonthlyUsage(audioFiles);
        setMonthlyUsage(usage);

        if (profile.plan === 'trial') {
          const count = await countUserAudioFiles(profile.id);
          setTrialUsageCount(count);
        }
      } catch (e) {
        console.error("Failed to calculate user usage status:", e);
      } finally {
          setIsLoading(false);
      }
    };

    calculateUsageAndLimits();
  }, [profile]);

  return useMemo(() => {
    const planLimits = getPlanLimits();
    const currentPlanLimit = profile ? planLimits[profile.plan || 'basico'] : 0;
    
    const isUsageLocked = monthlyUsage >= currentPlanLimit && currentPlanLimit !== Infinity;
    const isTrialUploadsLocked = profile?.plan === 'trial' && trialUsageCount >= TRIAL_MAX_FILES;
    const trialDaysRemaining = getTrialDaysRemaining(profile?.created_at);
    const hasTrialExpired = !!profile?.created_at && !isTrialActive(profile.created_at);
    const isTrialExpiredLocked = profile?.plan === 'trial' && hasTrialExpired;
    
    const usageLimitMinutes = currentPlanLimit === Infinity ? null : Math.round(currentPlanLimit / 60);

    return {
      isLoading,
      isTrialActive: isTrialActive(profile?.created_at),
      trialDaysRemaining,
      isTrialExpired: hasTrialExpired,
      isUsageLocked,
      isTrialUploadsLocked,
      isFeatureLocked: isTrialExpiredLocked || isUsageLocked || isTrialUploadsLocked,
      canAccessPremium: profile?.plan === 'premium',
      canAccessTeams: profile?.plan === 'ideal' || profile?.plan === 'premium',
      monthlyUsage,
      trialUsageCount,
      plan: profile?.plan || 'trial',
      usagePercentage: currentPlanLimit > 0 && currentPlanLimit !== Infinity ? (monthlyUsage / currentPlanLimit) * 100 : 0,
      usageLimitMinutes,
      TRIAL_MAX_FILES,
      TRIAL_MAX_FILE_SIZE_MB,
      TRIAL_MAX_DURATION_SECONDS,
    };
  }, [profile, monthlyUsage, trialUsageCount, isLoading]);
};