/** Fields excluded when trainers view a user's profile in list responses. */
export const TRAINER_VIEW_USER_SELECT =
  "-password -isDeleted -memory -workoutHistory";

export const formatUserForTrainerView = (
  user: Record<string, unknown> | null | undefined,
) => {
  if (!user || typeof user !== "object") return user;

  const {
    password: _password,
    isDeleted: _isDeleted,
    __v: _v,
    memory: _memory,
    workoutHistory: _workoutHistory,
    ...userProfile
  } = user;

  return userProfile;
};
