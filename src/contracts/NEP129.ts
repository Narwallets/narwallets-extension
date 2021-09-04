//JSON compatible struct returned from get_contract_info
export type ContractInfo = {
    dataVersion:number;
    name:string;
    version:string;
    developersAccountId:string;
    source:string;
    standards:string[],
    webAppUrl:string,
    auditorAccountId:string,
}
