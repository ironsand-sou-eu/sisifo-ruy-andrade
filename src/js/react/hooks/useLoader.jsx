import { useEffect, useState } from "react";
import { debounce } from "../../utils/utils";
import useErrorHandler from "./useErrorHandler";
import useLocation from "./useLocation";

export default function useLoader(setLoading, msgSetter, setFormData) {
    const [processoDraftedData, setProcessoDraftedData] = useState({});
    const { adaptedInfoHasErrors } = useErrorHandler(processoDraftedData, msgSetter);
    const { formatDateToInputString } = useLocation();
    
    useEffect(debounce(() => {
        if (processoDraftedData !== null) return;
        chrome.runtime.sendMessage({
                from: "sisifoPopup",
                subject: "query-processo-info-to-show"
            },
            response => {
                setProcessoDraftedData(response);
            }
        );
    }, [processoDraftedData]));

    useEffect(() => {
        if (processoDraftedData === null) return;
        setLoading({ scrapping: false, creating: false });
        if (adaptedInfoHasErrors()) return;
        const {
            projurisProcesso: {
                processoNumeroWs: [{numeroDoProcesso}], assuntoCnj, area, tipoJustica, vara, tipoVara, fase,
                gruposDeTrabalho, responsaveis, segredoJustica
            },
            projurisPartes: { partesRequerentes, partesRequeridas },
            responsaveisList,
            projurisPedidos: pedidos,
            projurisFaturamentos: faturamentos,
            bancosList
        } = processoDraftedData;
        const data = {
            numeroDoProcesso, area, tipoJustica, vara, tipoVara, assuntoCnj, fase, responsaveisList, gruposDeTrabalho,
            responsaveis, segredoJustica, partesRequerentes, partesRequeridas, pedidos, faturamentos,
            assunto: null,
            dataCitacao:  formatDateToInputString(new Date()),
            dataRecebimento: formatDateToInputString(new Date()),
            bancosList
        };
        setFormData(data);
    }, [processoDraftedData])

    return { processoDraftedData };
}