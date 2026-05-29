import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  getMyApprovedMembership,
  getMyInstructor,
  getMyMembership,
  getMyStudent,
} from "@/lib/futevolei";

export const futevoleiQueryKeys = {
  instructor: ["futevolei", "my-instructor"] as const,
  student: ["futevolei", "my-student"] as const,
  membership: ["futevolei", "my-membership"] as const,
  roles: ["futevolei", "roles"] as const,
};

export const myInstructorQuery = () =>
  queryOptions({
    queryKey: futevoleiQueryKeys.instructor,
    queryFn: getMyInstructor,
    staleTime: 30_000,
  });

export const myStudentQuery = () =>
  queryOptions({
    queryKey: futevoleiQueryKeys.student,
    queryFn: getMyStudent,
    staleTime: 30_000,
  });

export const myMembershipQuery = () =>
  queryOptions({
    queryKey: futevoleiQueryKeys.membership,
    queryFn: getMyMembership,
    staleTime: 15_000,
  });

export const futevoleiRolesQuery = (enabled = true) =>
  queryOptions({
    queryKey: futevoleiQueryKeys.roles,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const [instructor, student, approvedMembership] = await Promise.all([
        getMyInstructor(),
        getMyStudent(),
        getMyApprovedMembership(),
      ]);
      return {
        isInstructor: !!instructor,
        /** Aluno com vínculo aprovado — único caso em que o card aparece na Home */
        isApprovedStudent: !!student && !!approvedMembership,
      };
    },
  });

export function useFutevoleiRoles(enabled = true) {
  return useQuery(futevoleiRolesQuery(enabled));
}
