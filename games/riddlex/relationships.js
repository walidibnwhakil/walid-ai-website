// Relationship roles only. No names, contacts or personal identifiers are stored.
export const roles=[
["husband","Husband",{family:true,spouse:true,male:true}],
["wife","Wife",{family:true,spouse:true,female:true}],
["father","Father",{family:true,parent:true,male:true}],
["mother","Mother",{family:true,parent:true,female:true}],
["brother","Brother",{family:true,sibling:true,male:true}],
["sister","Sister",{family:true,sibling:true,female:true}],
["son","Son",{family:true,child:true,male:true}],
["daughter","Daughter",{family:true,child:true,female:true}],
["best-friend","Best friend",{friend:true,best:true}],
["friend","Friend",{friend:true,best:false}],
["boss","Boss",{work:true,supervisor:true}],
["colleague","Colleague",{work:true,supervisor:false}],
["teacher","Teacher",{education:true}],
["girlfriend","Girlfriend",{romantic:true,female:true,spouse:false}],
["boyfriend","Boyfriend",{romantic:true,male:true,spouse:false}]
].map(([id,name,facts])=>({id:"role-"+id,name:"Your "+name.toLowerCase(),category:"relationships",facts}));
export const relationshipQuestions={
family:"Is this person part of your family?",spouse:"Are you married to this person?",
male:"Is this person a man?",female:"Is this person a woman?",
parent:"Is this person one of your parents?",sibling:"Is this person your sibling?",
child:"Is this person your child?",friend:"Is this person your friend?",
best:"Do you consider this person your best friend?",work:"Do you work with this person?",
supervisor:"Is this person your boss?",education:"Is this person your teacher?",
romantic:"Are you in a romantic relationship with this person?"
};
