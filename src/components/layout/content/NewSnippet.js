import React from 'react';
import PropType from 'prop-types';
import { connect } from 'react-redux';
import styled from 'styled-components';
import {
  filter,
  findIndex,
  get,
  head,
  isEmpty,
  keys,
  map,
  set,
  replace,
  startsWith
} from 'lodash/fp';
import uuid from 'uuid';
import { HashRouter as Router, Link } from 'react-router-dom';

import * as snippetActions from 'actions/snippets';

import { DEFAULT_SNIPPET_DESCRIPTION } from 'constants/config';
import { syntaxMap } from 'constants/editor';

import { prepareFiles } from 'utils/snippets';
import { gaPage } from 'utils/ga';
import { getSetting } from 'utils/settings';
import { randomString } from 'utils/string';
import { hexToRGBA } from 'utils/color';

import Input from 'components/common/controls/Input';
import Editor from 'components/common/controls/Editor';
import Icon from 'components/common/Icon';
import ExternalLink from 'components/common/ExternalLink';
import Button from 'components/common/controls/Button';
import Checkbox from 'components/common/controls/Checkbox';
import DropZone from 'components/common/DropZone';
import Select from 'react-dropdown-select';
import { getTags } from 'selectors/snippets';

const StyledInput = styled(Input)`
  margin: 0;
  text-indent: 10px;
  width: 100%;
  z-index: 1;
`;

const StyledCheckbox = styled(Checkbox)`
  margin: 0 10px 0 0;
`;

const Section = styled.div`
  margin: 20px 0;
`;

const DescriptionSection = styled(Section)`
  display: flex;
`;

const FileSection = styled(Section)`
  border: 1px solid ${(props) => props.theme.baseAppColor};
  padding: 20px;
  border-radius: 3px;

  > div {
    display: flex;
    justify-content: space-around;
    align-items: center;
    margin: 0 0 -20px 0;
  }

  &:last-of-type {
    margin-bottom: 70px;
  }
`;

const StyledButton = styled(Button)`
  margin: 0 10px 0 0;
`;

const StyledDeleteButton = styled(StyledButton)`
  line-height: 21px;
  margin: 0 0 0 20px;
  width: auto;
  white-space: nowrap;
  color: ${(props) => props.theme.colorDanger};
  border-color: ${(props) => props.theme.colorDanger};

  span {
    background-color: ${(props) => props.theme.colorDanger};
  }
`;

const H1 = styled.h1`
  font-weight: 300;
  font-size: 22px;
`;

const ButtonsSection = styled.section`
  position: fixed;
  bottom: 0;
  padding: 20px;
  margin: 0 0 0 -25px;
  background: ${(props) => props.theme.bg};
  box-shadow: 0 -1px 2px ${(props) => props.theme.boxShadow};
  display: flex;
  justify-content: space-between;
  width: calc(100vw - 25px);
  z-index: 1;
`;

const StyledLink = styled(Link)`
  color: ${(props) => props.theme.baseAppColor};
  text-decoration: none;
  line-height: 25px;
`;

const StyledSelect = styled(Select)`
  margin-left: 20px;
  z-index: 1;
  width: 400px !important;
  background: #fff;
  border: none !important;
  border-bottom: 1px solid ${(props) => props.theme.baseAppColor} !important;
  border-radius: 0 !important;
  padding: 0 10px;
  min-height: 28px !important;
`;

const SearchAndToggle = styled.div`
  display: flex;
  flex-direction: column;

  input {
    margin: 10px 10px 0;
    line-height: 30px;
    padding: 0px 10px;
    border: 1px solid #ccc;
    border-radius: 3px;
    :focus {
      outline: none;
    }
  }
`;

const Items = styled.div`
  overflow: auto;
  min-height: 10px;
  max-height: 200px;
`;

const Item = styled.div`
  display: flex;
  align-items: baseline;
  ${({ disabled }) => disabled && 'text-decoration: line-through;'};
  cursor: pointer;

  :hover {
    background: ${(props) => hexToRGBA(props.theme.baseAppColor, 0.1)};
  }

  :first-child {
    margin-top: 10px;
  }

  :last-child {
    margin-bottom: 10px;
  }
`;

const ItemLabel = styled.div`
  margin: 5px 10px;
`;

export class NewSnippet extends React.Component {
  state = {
    public: getSetting('defaultNewIsPublic', false),
    description: '',
    files: [],
    tags: []
  };

  componentDidMount() {
    gaPage('Add new');
  }

  setDescription = (description) => {
    this.setState({ description });
  };

  setFileData = (value, id, type) => {
    const { files } = this.state;
    const indexofFile = findIndex({ uuid: id }, files);
    const newFiles = set([indexofFile, type], value, files);

    this.setState({ files: newFiles });
  };

  togglePublic = () => {
    this.setState((prevState) => ({
      public: !prevState.public
    }));
  };

  addFile = (name, content = '') => {
    const fileStructure = {
      uuid: uuid.v4(),
      name: name || randomString(5),
      language: getSetting('setings-default-new-snippet-language', 'Text'),
      content
    };

    this.setState((prevState) => ({
      files: [...prevState.files, fileStructure]
    }));
  };

  deleteFile = (id) => {
    const { files } = this.state;
    const updatedFiles = filter((file) => file.uuid !== id, files);

    this.setState({ files: updatedFiles });
  };

  save = () => {
    this.props.createSnippet({
      description: `${this.state.description} ${map('value', this.state.tags).join(' ')}`,
      isPublic: this.state.public,
      files: prepareFiles(this.state.files)
    });
  };

  seTags = (tagList) => {
    const tags = map((tag) => {
      if (!startsWith('#', tag.value)) {
        return set('value', `#${tag.value}`, tag);
      }

      return tag;
    }, tagList);

    this.setState({ tags });
  };

  mapArrayToSelectObject = (array) => map((key) => ({ label: key, value: key }), array);

  customDropdownRenderer = ({ props, state, methods }) => {
    const regexp = new RegExp(state.search, 'i');

    return (
      <div>
        <SearchAndToggle color={ props.color }>
          <input
            type="text"
            value={ state.search }
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onChange={ methods.setSearch }
            placeholder="Find language"/>
        </SearchAndToggle>
        <Items>
          {props.options
            .filter((item) => regexp.test(item[props.searchBy] || item[props.labelField]))
            .map((option) => {
              if (!props.keepSelectedInList && methods.isSelected(option)) {
                return null;
              }

              return (
                <Item
                  disabled={ option.disabled }
                  key={ option[props.valueField] }
                  onClick={ option.disabled ? null : () => methods.addItem(option) }>
                  <ItemLabel>{option[props.labelField]}</ItemLabel>
                </Item>
              );
            })}
        </Items>
      </div>
    );
  };

  render() {
    const { theme, tags } = this.props;
    const languageFromSettings = getSetting('setings-default-new-snippet-language', 'Text');

    return (
      <div>
        <DropZone onAddFile={ this.addFile } />

        <H1>
          <strong>New {this.state.public ? 'public' : 'private'} snippet:</strong>{' '}
          {this.state.description}
        </H1>

        <DescriptionSection>
          <StyledInput
            type="text"
            onChange={ (event) => this.setDescription(event.target.value) }
            placeholder={ `Description (default ${DEFAULT_SNIPPET_DESCRIPTION})` }/>
          <StyledSelect
            multi
            create
            style={ { zIndex: 2 } }
            createNewLabel="add '{search}' tag"
            values={ this.state.tags }
            options={ map(
              (tag) => ({ label: startsWith('#', tag) ? replace('#', '', tag) : tag, value: tag }),
              tags
            ) }
            color={ theme.baseAppColor }
            keepSelectedInList={ false }
            dropdownHeight="200px"
            addPlaceholder="+ Add more"
            placeholder="Add tags"
            onChange={ (values) => this.seTags(values) }/>
        </DescriptionSection>

        <Section>
          <StyledCheckbox
            checked={ this.state.public }
            value={ getSetting('defaultNewIsPublic', false) }
            onChange={ () => this.togglePublic() }/>
          &nbsp;
          <span>
            Public snippet &nbsp;
            <ExternalLink href="https://help.github.com/articles/about-gists/#types-of-gists">
              <Icon type="info" size="16" color={ theme.baseAppColor } />
            </ExternalLink>
          </span>
        </Section>

        {map(
          (file) => (
            <FileSection key={ file.uuid }>
              <div>
                <StyledInput
                  type="text"
                  value={ file.name }
                  onChange={ (event) => this.setFileData(event.target.value, file.uuid, 'name') }
                  placeholder="file.ext"/>
                <StyledSelect
                  values={ [
                    {
                      label: languageFromSettings,
                      value: languageFromSettings
                    }
                  ] }
                  color={ theme.baseAppColor }
                  contentRenderer={ ({ state }) => (
                    <div>{state.values && state.values[0].label}</div>
                  ) }
                  dropdownRenderer={ this.customDropdownRenderer }
                  placeholder="Select language"
                  options={ this.mapArrayToSelectObject(keys(syntaxMap)) }
                  onChange={ (value) =>
                    this.setFileData(get('value', head(value)), file.uuid, 'language')
                  }/>
                <StyledDeleteButton icon="delete" invert onClick={ () => this.deleteFile(file.uuid) }>
                  <strong>Remove</strong> {file.name || 'this file'}
                </StyledDeleteButton>
              </div>
              <br />
              <br />

              <Editor
                file={ file }
                isNew
                id={ file.uuid }
                onChange={ (value) => this.setFileData(value, file.uuid, 'content') }/>
            </FileSection>
          ),
          this.state.files
        )}

        <ButtonsSection>
          <Router>
            <StyledButton icon="arrow-left" invert>
              <StyledLink to="/">Back to list</StyledLink>
            </StyledButton>
          </Router>

          <StyledButton invert icon="add" onClick={ () => this.addFile() }>
            Add file
          </StyledButton>

          <StyledButton
            icon="success"
            onClick={ () => this.save() }
            disabled={ isEmpty(this.state.files) }>
            Save
          </StyledButton>
        </ButtonsSection>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  theme: get(['ui', 'settings', 'theme'], state),
  tags: getTags(state)
});

NewSnippet.propTypes = {
  createSnippet: PropType.func,
  theme: PropType.object,
  tags: PropType.array
};

export default connect(
  mapStateToProps,
  {
    createSnippet: snippetActions.createSnippet
  }
)(NewSnippet);
