import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sectionsAPI } from '../api/sections';

export const useSections = (courseId: string) => {
  return useQuery({
    queryKey: ['sections', courseId],
    queryFn: () => sectionsAPI.list(courseId),
    enabled: !!courseId,
  });
};

export const useCreateSection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: string; data: any }) =>
      sectionsAPI.create(courseId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sections', variables.courseId] });
    },
  });
};