// Rejections belong to the evidence available when the guess was rejected.
export function rejectGuess(history,id,answerCount){
 if(!id||history.some(item=>item.id===id))return history;
 return [...history,{id,atAnswerCount:answerCount}];
}
export function rewindRejections(history,answerCount){
 return history.filter(item=>item.atAnswerCount<=answerCount);
}
export function rejectedIds(history){
 return new Set(history.map(item=>item.id));
}
