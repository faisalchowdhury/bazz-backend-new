import { ExerciseBlockModel } from "../modules/exerciseBlock/exerciseBlock.model";
import { ExerciseModel } from "../modules/exercise/exercise.model";
import { IExerciseBlock } from "../modules/exerciseBlock/exerciseBlock.interface";
import { BUILT_IN_STARTER_BLOCK } from "./builtInExerciseBlocks.data";

export const seedStarterExerciseBlockForTrainer = async (trainerId: string) => {
  let block: IExerciseBlock | null = await ExerciseBlockModel.findOne({
    trainerId,
    name: BUILT_IN_STARTER_BLOCK.name,
  });
  if (!block) {
    block = await ExerciseBlockModel.create({
      trainerId,
      name: BUILT_IN_STARTER_BLOCK.name,
      description: BUILT_IN_STARTER_BLOCK.description,
      category: BUILT_IN_STARTER_BLOCK.category,
      isAiGenerated: false,
      isApproved: true,
    });
  } else {
    await ExerciseBlockModel.updateOne(
      { _id: block._id },
      {
        $set: {
          description: BUILT_IN_STARTER_BLOCK.description,
          category: BUILT_IN_STARTER_BLOCK.category,
          isApproved: true,
        },
      },
    );
  }

  for (const exercise of BUILT_IN_STARTER_BLOCK.exercises) {
    await ExerciseModel.findOneAndUpdate(
      { trainerId, blockId: block._id, name: exercise.name },
      {
        $set: {
          trainerId,
          blockId: block._id,
          ...exercise,
          isAiGenerated: false,
          isApproved: true,
        },
      },
      { upsert: true, new: true },
    );
  }

  return block.id;
};